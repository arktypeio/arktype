import { caller, getCallStack, rmRf, type SourcePosition } from "@ark/fs"
import { performance } from "node:perf_hooks"
import {
	ensureCacheDirs,
	getConfig,
	type ParsedAttestConfig
} from "../config.ts"
import { chainableNoOpProxy } from "../utils.ts"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.ts"
import {
	createTimeComparison,
	createTimeMeasure,
	type MarkMeasure,
	type Measure,
	type TimeUnit
} from "./measure.ts"
import { createBenchTypeAssertion, type BenchTypeAssertions } from "./type.ts"

export type StatName = keyof typeof stats

export type TimeAssertionName = StatName | "mark"

let benchHasRun = false

type BenchFn = <fn extends BenchableFunction>(
	name: string,
	fn: fn,
	options?: BenchOptions
) => InitialBenchAssertions<fn>

export interface Bench extends BenchFn {
	baseline: <T>(baselineExpressions: () => T) => void
}

const benchFn: BenchFn = (name, fn, options) => {
	const qualifiedPath = [...currentSuitePath, name]
	console.log(`🏌️  ${qualifiedPath.join("/")}`)
	const ctx = getBenchCtx(qualifiedPath, options)

	if (!benchHasRun) {
		rmRf(ctx.cfg.cacheDir)
		ensureCacheDirs()
		benchHasRun = true
	}

	ctx.benchCallPosition = caller()

	if (
		typeof ctx.cfg.filter === "string" &&
		!qualifiedPath.includes(ctx.cfg.filter)
	)
		return chainableNoOpProxy
	else if (
		Array.isArray(ctx.cfg.filter) &&
		ctx.cfg.filter.some((segment, i) => segment !== qualifiedPath[i])
	)
		return chainableNoOpProxy

	const assertions = new BenchAssertions(fn, ctx)
	Object.assign(assertions, createBenchTypeAssertion(ctx))
	return assertions as never
}

export const bench: Bench = Object.assign(benchFn, {
	baseline: () => {}
})

export const stats = {
	mean: (callTimes: number[]): number => {
		const totalCallMs = callTimes.reduce((sum, duration) => sum + duration, 0)
		return totalCallMs / callTimes.length
	},
	median: (callTimes: number[]): number => {
		const middleIndex = Math.floor(callTimes.length / 2)
		const ms =
			callTimes.length % 2 === 0 ?
				(callTimes[middleIndex - 1] + callTimes[middleIndex]) / 2
			:	callTimes[middleIndex]
		return ms
	}
}

const sampleMs = 0.2
const warmupMs = 500

let loopCount = 0

const AsyncFunction = (async () => {}).constructor as FunctionConstructor

// each loop's source is unique, so V8 shares no feedback between benches
const createLoop = (
	isAsync: boolean
): ((fn: () => unknown, n: number) => unknown) =>
	new (isAsync ? AsyncFunction : Function)(
		"fn",
		"n",
		`// bench loop ${loopCount++}
let result
for (let i = 0; i < n; i++) result = ${isAsync ? "await " : ""}fn()
return result`
	) as never

class ResultCollector {
	results: number[] = []
	callsPerSample = 1
	private bounds: Required<UntilOptions>
	private isWarm = false
	private phaseEnd: number
	private lastInvocationStart: number
	private ctx: BenchContext

	constructor(ctx: BenchContext) {
		this.ctx = ctx
		// By default, will sample for either 5 seconds or 100_000 samples, whichever comes first
		this.bounds = {
			ms: 5000,
			count: 100_000,
			...ctx.options.until
		}
		this.phaseEnd = performance.now() + Math.min(warmupMs, this.bounds.ms)
		this.lastInvocationStart = -1
	}

	start() {
		this.ctx.options.hooks?.beforeCall?.()
		this.lastInvocationStart = performance.now()
	}

	stop() {
		const end = performance.now()
		const ms = end - this.lastInvocationStart
		this.ctx.options.hooks?.afterCall?.()
		if (this.isWarm) this.results.push(ms / this.callsPerSample)
		else if (end < this.phaseEnd) {
			if (ms < sampleMs / 2) this.callsPerSample *= 2
		} else {
			this.callsPerSample = Math.max(
				1,
				Math.round((this.callsPerSample * sampleMs) / (ms || 1e-3))
			)
			this.isWarm = true
			this.phaseEnd = end + this.bounds.ms
		}
	}

	done() {
		return (
			this.isWarm &&
			(performance.now() >= this.phaseEnd ||
				this.results.length >= this.bounds.count)
		)
	}
}

const warnIfUnused = (result: unknown, ctx: BenchContext) => {
	if (result === undefined) {
		console.warn(
			`⚠️  ${ctx.qualifiedName} returned undefined. Return the result it computes so V8 can't optimize the work away.`
		)
	}
}

const loopCalls = (fn: () => unknown, ctx: BenchContext) => {
	const loop = createLoop(false)
	const collector = new ResultCollector(ctx)
	let result: unknown
	while (!collector.done()) {
		collector.start()
		result = loop(fn, collector.callsPerSample)
		collector.stop()
	}
	warnIfUnused(result, ctx)
	return collector.results
}

const loopAsyncCalls = async (fn: () => unknown, ctx: BenchContext) => {
	const loop = createLoop(true)
	const collector = new ResultCollector(ctx)
	let result: unknown
	while (!collector.done()) {
		collector.start()
		result = await loop(fn, collector.callsPerSample)
		collector.stop()
	}
	warnIfUnused(result, ctx)
	return collector.results
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
	typeof (value as PromiseLike<unknown> | undefined)?.then === "function"

export class BenchAssertions<
	Fn extends BenchableFunction,
	NextAssertions = BenchTypeAssertions,
	ReturnedAssertions = Fn extends () => PromiseLike<unknown> ?
		Promise<NextAssertions>
	:	NextAssertions
> {
	private label: string
	private lastCallTimes: number[] | undefined
	private fn: Fn
	private ctx: BenchContext

	constructor(fn: Fn, ctx: BenchContext) {
		this.fn = fn
		this.ctx = ctx
		this.label = `Call: ${ctx.qualifiedName}`
	}

	private applyCallTimeHooks() {
		if (this.ctx.options.fakeCallMs !== undefined) {
			const fakeMs =
				this.ctx.options.fakeCallMs === "count" ?
					this.lastCallTimes!.length
				:	this.ctx.options.fakeCallMs
			this.lastCallTimes = this.lastCallTimes!.map(() => fakeMs)
		}
	}

	private callTimesSync() {
		if (!this.lastCallTimes) {
			this.lastCallTimes = loopCalls(this.fn, this.ctx)
			this.lastCallTimes.sort((l, r) => l - r)
		}
		this.applyCallTimeHooks()
		return this.lastCallTimes
	}

	private async callTimesAsync() {
		if (!this.lastCallTimes) {
			this.lastCallTimes = await loopAsyncCalls(this.fn, this.ctx)
			this.lastCallTimes.sort((l, r) => l - r)
		}
		this.applyCallTimeHooks()
		return this.lastCallTimes
	}

	private createAssertion<Name extends TimeAssertionName>(
		name: Name,
		baseline: Name extends "mark" ?
			Record<StatName, Measure<TimeUnit>> | undefined
		:	Measure<TimeUnit> | undefined,
		callTimes: number[]
	) {
		if (name === "mark") return this.markAssertion(baseline as never, callTimes)

		const ms: number = stats[name as StatName](callTimes)
		const comparison = createTimeComparison(ms, baseline as Measure<TimeUnit>)
		console.group(`${this.label} (${name}):`)
		compareToBaseline(comparison, this.ctx)
		console.groupEnd()
		queueBaselineUpdateIfNeeded(createTimeMeasure(ms), baseline, {
			...this.ctx,
			lastSnapFunctionName: name
		})
		return this.getNextAssertions()
	}

	private markAssertion(
		baseline: MarkMeasure | undefined,
		callTimes: number[]
	) {
		console.group(`${this.label}:`)
		const markEntries: [StatName, Measure<TimeUnit> | undefined][] = (
			baseline ?
				Object.entries(baseline)
				// If nothing was passed, gather all available baselines by setting their values to undefined.
			:	Object.entries(stats).map(([kind]) => [kind, undefined])) as never
		const markResults = Object.fromEntries(
			markEntries.map(([kind, kindBaseline]) => {
				console.group(kind)
				const ms = stats[kind](callTimes)
				const comparison = createTimeComparison(ms, kindBaseline)
				compareToBaseline(comparison, this.ctx)
				console.groupEnd()
				return [kind, comparison.updated]
			})
		)
		console.groupEnd()
		queueBaselineUpdateIfNeeded(markResults, baseline, {
			...this.ctx,
			lastSnapFunctionName: "mark"
		})
		return this.getNextAssertions()
	}

	private getNextAssertions(): NextAssertions {
		return createBenchTypeAssertion(this.ctx) as never
	}

	private createStatMethod<Name extends TimeAssertionName>(
		name: Name,
		baseline: Name extends "mark" ?
			Record<StatName, Measure<TimeUnit>> | undefined
		:	Measure<TimeUnit> | undefined
	) {
		let assertions = chainableNoOpProxy
		const { hooks } = this.ctx.options
		try {
			hooks?.beforeCall?.()
			// fn may return a Promise without being an async function
			const firstResult = this.fn()
			if (isThenable(firstResult)) {
				return new Promise(resolve => {
					Promise.resolve(firstResult)
						.then(() => {
							hooks?.afterCall?.()
							return this.callTimesAsync()
						})
						.then(
							callTimes => {
								resolve(this.createAssertion(name, baseline, callTimes))
							},
							e => {
								this.addUnhandledBenchException(e)
								resolve(chainableNoOpProxy)
							}
						)
				})
			}
			hooks?.afterCall?.()
			assertions = this.createAssertion(name, baseline, this.callTimesSync())
		} catch (e) {
			this.addUnhandledBenchException(e)
		}
		return assertions
	}

	private addUnhandledBenchException(reason: unknown) {
		const message = `Bench ${
			this.ctx.qualifiedName
		} threw during execution:\n${String(reason)}`
		console.error(message)
		unhandledExceptionMessages.push(message)
	}

	median(baseline?: Measure<TimeUnit>): ReturnedAssertions {
		this.ctx.lastSnapCallPosition = caller()
		const assertions = this.createStatMethod("median", baseline)
		return assertions
	}

	mean(baseline?: Measure<TimeUnit>): ReturnedAssertions {
		this.ctx.lastSnapCallPosition = caller()
		return this.createStatMethod("mean", baseline)
	}

	mark(baseline?: MarkMeasure): ReturnedAssertions {
		this.ctx.lastSnapCallPosition = caller()
		return this.createStatMethod("mark", baseline as never)
	}
}

const unhandledExceptionMessages: string[] = []

export type UntilOptions = {
	ms?: number
	count?: number
}

export type BaseBenchOptions = {
	until?: UntilOptions
}

export type BenchOptions = BaseBenchOptions & {
	hooks?: {
		beforeCall?: () => void
		afterCall?: () => void
	}
}

export type InternalBenchOptions = BenchOptions & {
	fakeCallMs?: number | "count"
}

export type BenchContext = {
	qualifiedPath: string[]
	qualifiedName: string
	options: InternalBenchOptions
	cfg: ParsedAttestConfig
	assertionStack: string
	benchCallPosition: SourcePosition
	lastSnapCallPosition: SourcePosition | undefined
	lastSnapFunctionName: string | undefined
}

export type BenchableFunction = () => unknown | Promise<unknown>

export type InitialBenchAssertions<Fn extends BenchableFunction> =
	BenchAssertions<Fn> & BenchTypeAssertions

const currentSuitePath: string[] = []

process.on("beforeExit", () => {
	if (unhandledExceptionMessages.length) {
		console.error(
			`${unhandledExceptionMessages.length} unhandled exception(s) occurred during your benches (see details above).`
		)
		process.exit(1)
	}
})

export const getBenchCtx = (
	qualifiedPath: string[],
	options: BenchOptions = {}
): BenchContext => ({
	qualifiedPath,
	qualifiedName: qualifiedPath.join("/"),
	options,
	cfg: getConfig(),
	benchCallPosition: caller(),
	lastSnapCallPosition: undefined,
	lastSnapFunctionName: undefined,
	assertionStack: getCallStack({ offset: 1 }).join("\n")
})
