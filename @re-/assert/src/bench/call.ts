import { performance } from "node:perf_hooks"
import { transform } from "@re-/tools"
import { default as memoize } from "micro-memoize"
import {
    compareToBaseline,
    updateBaselineIfNeeded as updateBaselineIfNeeded
} from "./baseline.js"
import { BenchContext } from "./bench.js"
import {
    createMeasure,
    createMeasureComparison,
    MeasureString,
    stringifyMeasure
} from "./measure.js"

type StatName = "mean" | "median"

export type CallTimeAssertionName = "mark" | StatName

const loopCalls = (fn: () => void, ctx: BenchContext) => {
    const results: number[] = []
    const benchStart = performance.now()
    const until = ctx.options.until ?? {}
    const shouldContinue = () => {
        const elapsed = performance.now() - benchStart
        if (
            (until.count && results.length >= until.count) ||
            (until.ms && elapsed >= until.ms)
        ) {
            // If either option was passed directly and the condition has been met, stop looping
            return false
        }
        return (results.length < 1_000_000 || elapsed < 1000) && elapsed < 5000
    }
    while (shouldContinue()) {
        const invocationStart = performance.now()
        fn()
        results.push(performance.now() - invocationStart)
    }
    return results
}

export const getBenchCallAssertions = (fn: () => void, ctx: BenchContext) => {
    const getCallTimes = memoize(() => {
        const results = loopCalls(fn, ctx)
        results.sort()
        return results
    })
    const stats = {
        mean: () => {
            const callTimes = getCallTimes()
            const totalCallMs = callTimes.reduce(
                (sum, duration) => sum + duration,
                0
            )
            return totalCallMs / callTimes.length
        },
        median: () => {
            const callTimes = getCallTimes()
            const middleIndex = Math.floor(callTimes.length / 2)
            return callTimes.length % 2 === 0
                ? (callTimes[middleIndex - 1] + callTimes[middleIndex]) / 2
                : callTimes[middleIndex]
        }
    }
    const mark = (baseline?: Record<StatName, MeasureString>) => {
        const markEntries: [StatName, MeasureString | undefined][] = (
            baseline
                ? Object.entries(baseline)
                : // If nothing was passed, gather all available baselines by setting their values to undefined.
                  Object.entries(stats).map(([kind]) => [kind, undefined])
        ) as any
        console.group(`${ctx.name}:`)
        const markResults = transform(
            markEntries,
            ([, [kind, kindBaseline]]) => {
                console.group(kind)
                const ms = stats[kind]()
                const comparison = createMeasureComparison(ms, kindBaseline)
                compareToBaseline(comparison, ctx)
                console.groupEnd()
                return [kind, stringifyMeasure(comparison.result)]
            }
        )
        console.groupEnd()
        updateBaselineIfNeeded(markResults, baseline, {
            ...ctx,
            kind: "mark"
        })
    }
    const individualAssertions = transform(stats, ([kind, calculate]) => {
        const assertionOfKind = (baseline?: MeasureString) => {
            const ms = calculate()
            const comparison = createMeasureComparison(ms, baseline)
            console.group(`${ctx.name} (${kind}):`)
            compareToBaseline(comparison, ctx)
            console.groupEnd()
            updateBaselineIfNeeded(
                stringifyMeasure(createMeasure(ms)),
                baseline,
                {
                    ...ctx,
                    kind
                }
            )
        }
        return [kind, assertionOfKind]
    })
    return {
        mark,
        ...individualAssertions
    }
}
