import { performance } from "node:perf_hooks"
import { caller } from "@re-/node"
import { asNumber, ElementOf, isAlpha, toString, transform } from "@re-/tools"
import { default as memoize } from "micro-memoize"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "../common.js"
import { writeInlineSnapshotToFile } from "../value/snapshot.js"

export type BenchOptions = {
    until?: {
        ms?: number
        count?: number
    }
}

const timeUnits = ["s", "ms", "μs", "ns"] as const

type TimeUnit = ElementOf<typeof timeUnits>

type BaselineKind = "mean" | "median"

type BaselineAssertionFunction = "mark" | BaselineKind

type Measure = {
    n: number
    unit: TimeUnit
}

type MeasureString = `${number}${TimeUnit}`

type MeasureComparison = {
    result: Measure
    baseline: Measure | undefined
}

const parseMeasure = (s: MeasureString): Measure => {
    // If both the last characters are alpha, the unit should be exactly 2 characters.
    // Otherwise, it should be "s" (seconds)
    const unitLength = isAlpha(s.slice(-2)) ? 2 : 1
    const n = asNumber(s.slice(0, -unitLength))
    const unit = s.slice(-unitLength) as TimeUnit
    if (n === null) {
        throw new Error(
            `Unable to parse baseline '${s}': expected '${n}' to be numeric.`
        )
    }
    if (!timeUnits.includes(unit)) {
        throw new Error(
            `Unable to parse baseline '${s}': unknown timing unit '${unit}'.`
        )
    }
    return {
        n,
        unit
    }
}

const stringifyMeasure = (m: Measure) =>
    `${m.n.toPrecision(3)}${m.unit}` as MeasureString

const TIME_UNIT_RATIOS: { [Unit in TimeUnit]: number } = {
    ns: 0.000_001,
    μs: 0.001,
    ms: 1,
    s: 1000
}

const convert = (n: number, from: TimeUnit, to: TimeUnit) => {
    return (n * TIME_UNIT_RATIOS[from]) / TIME_UNIT_RATIOS[to]
}

/**
 * Establish a new baseline using the most appropriate time unit
 */
const createMeasure = (ms: number) => {
    let bestMatch: Measure | undefined
    for (const u in TIME_UNIT_RATIOS) {
        const unit = u as TimeUnit
        const n = convert(ms, "ms", unit)
        const candidateMeasure: Measure = {
            n,
            unit
        }
        if (!bestMatch) {
            bestMatch = candidateMeasure
        } else if (bestMatch.n >= 1) {
            if (n >= 1 && n < bestMatch.n) {
                bestMatch = candidateMeasure
            }
        } else {
            if (n >= bestMatch.n) {
                bestMatch = candidateMeasure
            }
        }
    }
    return bestMatch!
}

const createMeasureComparison = (
    ms: number,
    baselineString: MeasureString | undefined
): MeasureComparison => {
    if (baselineString) {
        // Convert the new result to the existing units for comparison
        const baseline = parseMeasure(baselineString)
        return {
            result: {
                n: convert(ms, "ms", baseline.unit),
                unit: baseline.unit
            },
            baseline
        }
    }
    return {
        result: createMeasure(ms),
        baseline: undefined
    }
}

const checkBenchResult = (
    { result, baseline }: MeasureComparison,
    { name, config }: BenchContext
) => {
    console.log(`🏌️ Result: ${result.n.toPrecision(3)}${result.unit}`)
    if (baseline && !config.updateSnapshots) {
        console.log(`⛳ Baseline: ${baseline.n.toPrecision(3)}${baseline.unit}`)
        const delta = ((result.n - baseline.n) / baseline.n) * 100
        const formattedDelta = `${delta.toFixed(2)}%`
        if (delta > config.benchPercentThreshold) {
            const message = `'${name}' exceeded baseline by ${formattedDelta} (treshold is ${config.benchPercentThreshold}%).`
            console.error(`📈 ${message}`)
            process.exitCode = 1
            // Summarize failures at the end of output
            process.on("exit", () => {
                console.error(`❌ ${message}`)
            })
        } else if (delta < -config.benchPercentThreshold) {
            console.log(
                // Remove the leading negative when formatting our delta
                `📉 ${name} was under baseline by ${formattedDelta.slice(
                    1
                )}! Consider setting a new baseline.`
            )
        } else {
            console.log(`📊 Delta: ${delta > 0 ? "+" : ""}${formattedDelta}`)
        }
    }
}

interface BenchContext {
    name: string
    options: BenchOptions
    config: ReAssertConfig
    position: SourcePosition
}

interface BenchAssertionContext extends BenchContext {
    kind: BaselineAssertionFunction
}

const serializeBaseline = (baseline: string | object) =>
    toString(baseline, { quotes: "double" })

const updateBaseline = (
    result: string | object,
    baseline: string | object | undefined,
    ctx: BenchAssertionContext
) => {
    console.log(
        `✍️  ${baseline ? "Establishing" : "Updating"} your baseline...`
    )
    const serializedValue = serializeBaseline(result)
    writeInlineSnapshotToFile({
        position: ctx.position,
        serializedValue,
        snapFunctionName: ctx.kind
    })
    // Summarize updates at the end of output
    process.on("beforeExit", () => {
        let updateSummary = `  ${
            baseline ? "⬆️  Updated" : "✨  Established"
        } baseline '${ctx.name}' `
        updateSummary += baseline
            ? `from ${serializeBaseline(baseline)} to `
            : "at "
        updateSummary += `${serializedValue}.`
        console.groupEnd()
        console.log(updateSummary)
    })
}

const getBenchAssertions = (results: number[], ctx: BenchContext) => {
    const getSortedResults = memoize(() => results.sort())
    const stats = {
        mean: () => {
            const totalCallMs = results.reduce(
                (sum, duration) => sum + duration,
                0
            )
            return totalCallMs / results.length
        },
        median: () => {
            const sortedResults = getSortedResults()
            const middleIndex = Math.floor(sortedResults.length / 2)
            return sortedResults.length % 2 === 0
                ? (sortedResults[middleIndex - 1] +
                      sortedResults[middleIndex]) /
                      2
                : sortedResults[middleIndex]
        }
    }
    const mark = (baseline?: Record<BaselineKind, MeasureString>) => {
        const markEntries: [BaselineKind, MeasureString][] = (
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
                checkBenchResult(comparison, ctx)
                console.groupEnd()
                return [kind, stringifyMeasure(comparison.result)]
            }
        )
        console.groupEnd()
        if (!baseline || ctx.config.updateSnapshots) {
            updateBaseline(markResults, baseline, {
                ...ctx,
                kind: "mark"
            })
        }
    }
    const individualAssertions = transform(stats, ([kind, calculate]) => {
        const assertionOfKind = (baseline?: MeasureString) => {
            const ms = calculate()
            const comparison = createMeasureComparison(
                ms,
                ctx.config.updateSnapshots ? undefined : baseline
            )
            console.group(`${ctx.name} (${kind}):`)
            checkBenchResult(comparison, ctx)
            console.groupEnd()
            if (!baseline || ctx.config.updateSnapshots) {
                updateBaseline(stringifyMeasure(comparison.result), baseline, {
                    ...ctx,
                    kind
                })
            }
        }
        return [kind, assertionOfKind]
    })
    return {
        mark,
        ...individualAssertions
    }
}

export const bench = (
    name: string,
    functionToTest: () => void,
    options: BenchOptions = {}
) => {
    const results: number[] = []
    const benchStart = performance.now()
    const until = options?.until ?? {}
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
        functionToTest()
        results.push(performance.now() - invocationStart)
    }
    return getBenchAssertions(results, {
        name,
        options,
        config: getReAssertConfig(),
        position: caller()
    })
}
