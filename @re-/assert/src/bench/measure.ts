import { asNumber, ElementOf, isAlpha } from "@re-/tools"

const timeUnits = ["s", "ms", "μs", "ns"] as const

type TimeUnit = ElementOf<typeof timeUnits>

export type Measure = {
    n: number
    unit: TimeUnit
}

export type MeasureString = `${number}${TimeUnit}`

const measureRegex = new RegExp(
    `^(0|[1-9]\\d*)(\\.\\d+)?${timeUnits.join("|")}$`
)

export type MeasureComparison = {
    result: Measure
    baseline: Measure | undefined
}

export const parseMeasure = (s: MeasureString): Measure => {
    if (!measureRegex.test(s)) {
        throw new Error(
            `Bench measure '${s}' must be of the format "<number><${timeUnits.join(
                "|"
            )}>".`
        )
    }
    // If both the last characters are alpha, the unit should be exactly 2 characters.
    // Otherwise, it should be "s" (seconds)
    const unitLength = isAlpha(s.slice(-2)) ? 2 : 1
    const n = asNumber(s.slice(0, -unitLength), { assert: true })
    const unit = s.slice(-unitLength) as TimeUnit
    return {
        n,
        unit
    }
}

export const stringifyMeasure = (m: Measure) =>
    `${m.n.toFixed(2)}${m.unit}` as MeasureString

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
export const createMeasure = (ms: number) => {
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

export const createMeasureComparison = (
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
