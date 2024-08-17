import { caller, rmRf, type SourcePosition } from "@ark/fs"
import { performance } from "node:perf_hooks"
import {
	ensureCacheDirs,
	getConfig,
	type ParsedAttestConfig
} from "../config.ts"
import { chainableNoOpProxy } from "../utils.ts"
import { await1K } from "./await1k.ts"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.ts"
import { call1K } from "./call1k.ts"
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
	const ctx = getBenchCtx(
		qualifiedPath,
		fn.constructor.name === "AsyncFunction",
		options
	)

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

class ResultCollector {
	results: number[] = []
	private benchStart = performance.now()
	private bounds: Required<UntilOptions>
	private lastInvocationStart: number
	private ctx: BenchContext

	constructor(ctx: BenchContext) {
		this.ctx = ctx
		// By default, will run for either 5 seconds or 100_000 call sets (of 1000 calls), whichever comes first
		this.bounds = {
			ms: 5000,
			count: 100_000,
			...ctx.options.until
		}
		this.lastInvocationStart = -1
	}

	start() {
		this.ctx.options.hooks?.beforeCall?.()
		this.lastInvocationStart = performance.now()
	}

	stop() {
		this.results.push((performance.now() - this.lastInvocationStart) / 1000)
		this.ctx.options.hooks?.afterCall?.()
	}

	done() {
		const metMsTarget = performance.now() - this.benchStart >= this.bounds.ms
		const metCountTarget = this.results.length >= this.bounds.count
		return metMsTarget || metCountTarget
	}
}

const loopCalls = (fn: () => void, ctx: BenchContext) => {
	const collector = new ResultCollector(ctx)
	while (!collector.done()) {
		collector.start()
		// we use a function like this to make 1k explicit calls to the function
		// to avoid certain optimizations V8 makes when looping
		call1K(fn)
		collector.stop()
	}
	return collector.results
}

const loopAsyncCalls = async (fn: () => Promise<void>, ctx: BenchContext) => {
	const collector = new ResultCollector(ctx)
	while (!collector.done()) {
		collector.start()
		await await1K(fn)
		collector.stop()
	}
	return collector.results
}

export class BenchAssertions<
	Fn extends BenchableFunction,
	NextAssertions = BenchTypeAssertions,
	ReturnedAssertions = Fn extends () => Promise<void> ? Promise<NextAssertions>
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
			this.lastCallTimes = loopCalls(this.fn as never, this.ctx)
			this.lastCallTimes.sort()
		}
		this.applyCallTimeHooks()
		return this.lastCallTimes
	}

	private async callTimesAsync() {
		if (!this.lastCallTimes) {
			this.lastCallTimes = await loopAsyncCalls(this.fn as never, this.ctx)
			this.lastCallTimes.sort()
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
			kind: name
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
			kind: "mark"
		})
		return this.getNextAssertions()
	}

	private getNextAssertions(): NextAssertions {
		return createBenchTypeAssertion(this.ctx) as never as NextAssertions
	}

	private createStatMethod<Name extends TimeAssertionName>(
		name: Name,
		baseline: Name extends "mark" ?
			Record<StatName, Measure<TimeUnit>> | undefined
		:	Measure<TimeUnit> | undefined
	) {
		if (this.ctx.isAsync) {
			return new Promise(resolve => {
				this.callTimesAsync().then(
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
		let assertions = chainableNoOpProxy
		try {
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
		const assertions = this.createStatMethod(
			"median",
			baseline
		) as never as ReturnedAssertions
		return assertions
	}

	mean(baseline?: Measure<TimeUnit>): ReturnedAssertions {
		this.ctx.lastSnapCallPosition = caller()
		return this.createStatMethod(
			"mean",
			baseline
		) as never as ReturnedAssertions
	}

	mark(baseline?: MarkMeasure): ReturnedAssertions {
		this.ctx.lastSnapCallPosition = caller()
		return this.createStatMethod(
			"mark",
			baseline as never
		) as never as ReturnedAssertions
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
	benchCallPosition: SourcePosition
	lastSnapCallPosition: SourcePosition | undefined
	isAsync: boolean
	kind: TimeAssertionName | "types" | "instantiations"
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
	isAsync: boolean = false,
	options: BenchOptions = {}
): BenchContext =>
	({
		qualifiedPath,
		qualifiedName: qualifiedPath.join("/"),
		options,
		cfg: getConfig(),
		benchCallPosition: caller(),
		lastSnapCallPosition: undefined,
		isAsync
	}) as BenchContext
