import { caller } from "@arktype/fs"
import { performance } from "node:perf_hooks"
import { chainableNoOpProxy } from "../utils.js"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.js"
import type { BenchContext, BenchableFunction, UntilOptions } from "./bench.js"
import { await1K } from "./generated/await1k.js"
import { call1K } from "./generated/call1k.js"
import {
	createTimeComparison,
	createTimeMeasure,
	type MarkMeasure,
	type Measure,
	type TimeUnit
} from "./measure.js"
import { createBenchTypeAssertion, type BenchTypeAssertions } from "./type.js"

export type StatName = keyof typeof stats

export type TimeAssertionName = StatName | "mark"

export const stats = {
	mean: (callTimes: number[]) => {
		const totalCallMs = callTimes.reduce(
			(sum, duration) => sum + duration,
			0
		)
		return totalCallMs / callTimes.length
	},
	median: (callTimes: number[]) => {
		const middleIndex = Math.floor(callTimes.length / 2)
		const ms =
			callTimes.length % 2 === 0
				? (callTimes[middleIndex - 1] + callTimes[middleIndex]) / 2
				: callTimes[middleIndex]
		return ms
	}
}

class ResultCollector {
	results: number[] = []
	private benchStart = performance.now()
	private bounds: Required<UntilOptions>
	private lastInvocationStart: number

	constructor(private ctx: BenchContext) {
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
		const metMsTarget =
			performance.now() - this.benchStart >= this.bounds.ms
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
	ReturnedAssertions = Fn extends () => Promise<void>
		? Promise<NextAssertions>
		: NextAssertions
> {
	private label: string
	private lastCallTimes: number[] | undefined
	constructor(
		private fn: Fn,
		private ctx: BenchContext
	) {
		this.label = `Call: ${ctx.qualifiedName}`
	}

	private applyCallTimeHooks() {
		if (this.ctx.options.fakeCallMs !== undefined) {
			const fakeMs =
				this.ctx.options.fakeCallMs === "count"
					? this.lastCallTimes!.length
					: this.ctx.options.fakeCallMs
			this.lastCallTimes = this.lastCallTimes!.map(() => fakeMs)
		}
	}

	private callTimesSync() {
		if (!this.lastCallTimes) {
			this.lastCallTimes = loopCalls(this.fn as any, this.ctx)
			this.lastCallTimes.sort()
		}
		this.applyCallTimeHooks()
		return this.lastCallTimes
	}

	private async callTimesAsync() {
		if (!this.lastCallTimes) {
			this.lastCallTimes = await loopAsyncCalls(this.fn as any, this.ctx)
			this.lastCallTimes.sort()
		}
		this.applyCallTimeHooks()
		return this.lastCallTimes
	}

	private createAssertion<Name extends TimeAssertionName>(
		name: Name,
		baseline: Name extends "mark"
			? Record<StatName, Measure<TimeUnit>> | undefined
			: Measure<TimeUnit> | undefined,
		callTimes: number[]
	) {
		if (name === "mark") {
			return this.markAssertion(baseline as any, callTimes)
		}
		const ms: number = stats[name as StatName](callTimes)
		const comparison = createTimeComparison(
			ms,
			baseline as Measure<TimeUnit>
		)
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
			baseline
				? Object.entries(baseline)
				: // If nothing was passed, gather all available baselines by setting their values to undefined.
					Object.entries(stats).map(([kind]) => [kind, undefined])
		) as any
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
		return createBenchTypeAssertion(this.ctx) as any as NextAssertions
	}

	private createStatMethod<Name extends TimeAssertionName>(
		name: Name,
		baseline: Name extends "mark"
			? Record<StatName, Measure<TimeUnit>> | undefined
			: Measure<TimeUnit> | undefined
	) {
		if (this.ctx.isAsync) {
			return new Promise((resolve) => {
				this.callTimesAsync().then(
					(callTimes) => {
						resolve(this.createAssertion(name, baseline, callTimes))
					},
					(e) => {
						this.addUnhandledBenchException(e)
						resolve(chainableNoOpProxy)
					}
				)
			})
		}
		let assertions = chainableNoOpProxy
		try {
			assertions = this.createAssertion(
				name,
				baseline,
				this.callTimesSync()
			)
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

	median(baseline?: Measure<TimeUnit>) {
		this.ctx.lastSnapCallPosition = caller()
		const assertions = this.createStatMethod(
			"median",
			baseline
		) as any as ReturnedAssertions
		return assertions
	}

	mean(baseline?: Measure<TimeUnit>) {
		this.ctx.lastSnapCallPosition = caller()
		return this.createStatMethod(
			"mean",
			baseline
		) as any as ReturnedAssertions
	}

	mark(baseline?: MarkMeasure) {
		this.ctx.lastSnapCallPosition = caller()
		return this.createStatMethod(
			"mark",
			baseline as any
		) as any as ReturnedAssertions
	}
}

const unhandledExceptionMessages: string[] = []

process.on("beforeExit", () => {
	if (unhandledExceptionMessages.length) {
		console.error(
			`${unhandledExceptionMessages.length} unhandled exception(s) occurred during your benches (see details above).`
		)
		process.exit(1)
	}
})
