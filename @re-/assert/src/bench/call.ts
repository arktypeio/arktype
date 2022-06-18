import { performance } from "node:perf_hooks"
import { caller } from "@re-/node"
import { transform } from "@re-/tools"
import {
    compareToBaseline,
    updateBaselineIfNeeded as updateBaselineIfNeeded
} from "./baseline.js"
import { BenchableFunction, BenchContext, UntilOptions } from "./bench.js"
import {
    createMeasure,
    createMeasureComparison,
    MeasureString,
    stringifyMeasure
} from "./measure.js"
import { BenchTypeAssertions, createBenchTypeAssertions } from "./type.js"

export type StatName = keyof typeof stats

export type AssertionName = StatName | "mark"

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
        return callTimes.length % 2 === 0
            ? (callTimes[middleIndex - 1] + callTimes[middleIndex]) / 2
            : callTimes[middleIndex]
    }
}

class ResultCollector {
    results: number[] = []
    private benchStart = performance.now()
    private bounds: Required<UntilOptions>
    private lastInvocationStart: number

    constructor(private ctx: BenchContext) {
        // By default, will run for either 5 seconds or 1M calls, whichever comes first
        this.bounds = {
            ms: 5000,
            count: 1_000_000,
            ...ctx.options.until
        }
        this.lastInvocationStart = Number.NaN
    }

    startCall() {
        this.ctx.options.hooks?.beforeCall?.()
        this.lastInvocationStart = performance.now()
    }

    stopCall() {
        this.results.push(performance.now() - this.lastInvocationStart)
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
        collector.startCall()
        fn()
        collector.stopCall()
    }
    return collector.results
}

const loopAsyncCalls = async (fn: () => Promise<void>, ctx: BenchContext) => {
    const collector = new ResultCollector(ctx)
    while (!collector.done()) {
        collector.startCall()
        await fn()
        collector.stopCall()
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
    constructor(private fn: Fn, private ctx: BenchContext) {
        this.label = `${ctx.isTypeAssertion ? "Typecheck" : "Call"}: ${
            ctx.name
        }`
    }

    private callTimesSync() {
        if (!this.lastCallTimes) {
            this.lastCallTimes = loopCalls(this.fn as any, this.ctx)
            this.lastCallTimes.sort()
        }
        return this.lastCallTimes
    }

    private async callTimesAsync() {
        if (!this.lastCallTimes) {
            this.lastCallTimes = await loopAsyncCalls(this.fn as any, this.ctx)
            this.lastCallTimes.sort()
        }
        return this.lastCallTimes
    }

    private createAssertion<Name extends AssertionName>(
        name: Name,
        baseline: Name extends "mark"
            ? Record<StatName, MeasureString> | undefined
            : MeasureString | undefined,
        callTimes: number[]
    ) {
        if (name === "mark") {
            return this.markAssertion(baseline as any, callTimes)
        }
        const ms: number = (stats as any)[name](callTimes)
        const comparison = createMeasureComparison(
            ms,
            baseline as MeasureString
        )
        console.group(`${this.label} (${name}):`)
        compareToBaseline(comparison, this.ctx)
        console.groupEnd()
        updateBaselineIfNeeded(stringifyMeasure(createMeasure(ms)), baseline, {
            ...this.ctx,
            kind: name
        })
        return this.getNextAssertions()
    }

    private markAssertion(
        baseline: Record<StatName, MeasureString> | undefined,
        callTimes: number[]
    ) {
        console.group(`${this.label}:`)
        const markEntries: [StatName, MeasureString | undefined][] = (
            baseline
                ? Object.entries(baseline)
                : // If nothing was passed, gather all available baselines by setting their values to undefined.
                  Object.entries(stats).map(([kind]) => [kind, undefined])
        ) as any
        const markResults = transform(
            markEntries,
            ([, [kind, kindBaseline]]) => {
                console.group(kind)
                const ms = stats[kind](callTimes)
                const comparison = createMeasureComparison(ms, kindBaseline)
                compareToBaseline(comparison, this.ctx)
                console.groupEnd()
                return [kind, stringifyMeasure(comparison.result)]
            }
        )
        console.groupEnd()
        updateBaselineIfNeeded(markResults, baseline, {
            ...this.ctx,
            kind: "mark"
        })
        return this.getNextAssertions()
    }

    private getNextAssertions(): NextAssertions {
        return (
            this.ctx.isTypeAssertion ? {} : createBenchTypeAssertions(this.ctx)
        ) as NextAssertions
    }

    private createStatMethod<Name extends AssertionName>(
        name: Name,
        baseline: Name extends "mark"
            ? Record<StatName, MeasureString> | undefined
            : MeasureString | undefined
    ) {
        if (this.ctx.isAsync) {
            return new Promise((resolve, reject) => {
                this.callTimesAsync().then((callTimes) => {
                    resolve(this.createAssertion(name, baseline, callTimes))
                }, reject)
            })
        }
        return this.createAssertion(name, baseline, this.callTimesSync())
    }

    median(baseline?: MeasureString) {
        this.ctx.lastSnapCallPosition = caller()
        return this.createStatMethod(
            "median",
            baseline
        ) as any as ReturnedAssertions
    }

    mean(baseline?: MeasureString) {
        this.ctx.lastSnapCallPosition = caller()
        return this.createStatMethod(
            "mean",
            baseline
        ) as any as ReturnedAssertions
    }

    mark(baseline?: Record<StatName, MeasureString>) {
        this.ctx.lastSnapCallPosition = caller()
        return this.createStatMethod(
            "mark",
            baseline
        ) as any as ReturnedAssertions
    }
}
