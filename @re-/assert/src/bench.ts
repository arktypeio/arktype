import { performance } from "node:perf_hooks"
import { caller } from "@re-/node"
import { getReAssertConfig, ReAssertConfig, SourcePosition } from "./common.js"
import { writeInlineSnapshotToFile } from "./value/snapshot.js"

export type BenchOptions = {
    until?: {
        ms?: number
        count?: number
    }
}

type TimeUnit = "s" | "ms"

type BaselineKind = "mean"

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
    const unitLength = s.endsWith("ms") ? 2 : 1
    return {
        n: Number(s.slice(0, -unitLength)),
        unit: s.slice(-unitLength) as TimeUnit
    }
}

const stringifyMeasure = (m: Measure) => `${m.n.toPrecision(3)}${m.unit}`

const TIME_UNIT_RATIOS: { [Unit in TimeUnit]: number } = {
    ms: 1,
    s: 1000
}

const convert = (n: number, from: TimeUnit, to: TimeUnit) => {
    return (n * TIME_UNIT_RATIOS[from]) / TIME_UNIT_RATIOS[to]
}

/**
 * Establish a new baseline using the most appropriate time unit
 */
const createBaseline = (ms: number) => {
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

const toMeasureComparison = (
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
        result: createBaseline(ms),
        baseline: undefined
    }
}

export const compareMeasures = (
    { result, baseline }: MeasureComparison,
    { name, config, kind, position }: ComparisonContext
) => {
    console.group(`${name}:`)
    console.log(`🏌️ Result: ${result.n.toPrecision(3)}${result.unit}`)
    if (baseline && !config.updateSnapshots) {
        console.log(`⛳ Baseline: ${baseline.n.toPrecision(3)}${baseline.unit}`)
        const delta = ((result.n - baseline.n) / baseline.n) * 100
        const formattedDelta = `${delta.toPrecision(3)}%`
        if (delta > config.benchPercentThreshold) {
            console.error(
                `📈 ${name} exceeded baseline by ${formattedDelta} (treshold is ${config.benchPercentThreshold}%).`
            )
            process.exitCode = 1
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
    } else {
        console.log(`✍️ Establishing your new baseline...`)
        writeInlineSnapshotToFile({
            position,
            serializedValue: `"${stringifyMeasure(result)}"`,
            snapFunctionName: kind
        })
    }
    console.groupEnd()
}

type ComparisonContext = {
    name: string
    kind: BaselineKind
    options: BenchOptions
    config: ReAssertConfig
    position: SourcePosition
}

export const bench = (
    name: string,
    functionToTest: () => void,
    options: BenchOptions = {}
) => {
    const ctx = {
        name,
        options,
        config: getReAssertConfig(),
        position: caller()
    }
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
        // Else, default to a relatively conservative standard
        return (results.length < 1_000_000 || elapsed < 1000) && elapsed < 5000
    }
    while (shouldContinue()) {
        const invocationStart = performance.now()
        functionToTest()
        results.push(performance.now() - invocationStart)
    }
    return {
        mean: (baseline?: MeasureString) => {
            const totalCallMs = results.reduce(
                (sum, duration) => sum + duration,
                0
            )
            const meanCallMs = totalCallMs / results.length
            const comparison = toMeasureComparison(meanCallMs, baseline)
            compareMeasures(comparison, { ...ctx, kind: "mean" })
        }
    }
}
