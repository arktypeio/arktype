import { asNumber } from "@re-/tools"
import { Measure, MeasureComparison } from "./measure.js"

const TIME_UNIT_RATIOS = Object.freeze({
    ns: 0.000_001,
    us: 0.001,
    ms: 1,
    s: 1000
})

const TIME_UNITS = Object.keys(TIME_UNIT_RATIOS)

export type TimeUnit = keyof typeof TIME_UNIT_RATIOS

export type TimeString = `${number}${TimeUnit}`

const timeStringRegex = new RegExp(
    `^(0|[1-9]\\d*)(\\.\\d+)?(${TIME_UNITS.join("|")})$`
)

const assertTimeString: (s: string) => asserts s is TimeString = (
    s: string
) => {
    if (!timeStringRegex.test(s)) {
        throw new Error(
            `Bench measure '${s}' must be of the format "<number><${TIME_UNITS.join(
                "|"
            )}>".`
        )
    }
}

export const parseTimeString = (s: TimeString): Measure<TimeUnit> => {
    assertTimeString(s)
    // If the two last characters match one of the units, split based on a unit length of two
    // The only other possibility since the regex was matched is length one ("s")
    const unitLength = TIME_UNITS.includes(s.slice(-2)) ? 2 : 1
    const n = asNumber(s.slice(0, -unitLength), { assert: true })
    const unit = s.slice(-unitLength) as TimeUnit
    return {
        n,
        unit
    }
}

export const stringifyTimeMeasure = (m: Measure<TimeUnit>) =>
    `${m.n} ${m.unit}` as TimeString

const convertTimeMeasure = (n: number, from: TimeUnit, to: TimeUnit) => {
    return (n * TIME_UNIT_RATIOS[from]) / TIME_UNIT_RATIOS[to]
}

/**
 * Establish a new baseline using the most appropriate time unit
 */
export const createTimeMeasure = (ms: number) => {
    let bestMatch: Measure<TimeUnit> | undefined
    for (const u in TIME_UNIT_RATIOS) {
        const unit = u as TimeUnit
        const n = convertTimeMeasure(ms, "ms", unit)
        const candidateMeasure: Measure<TimeUnit> = {
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

export const createTimeComparison = (
    ms: number,
    baselineString: TimeString | undefined
): MeasureComparison<TimeUnit> => {
    if (baselineString) {
        // Convert the new result to the existing units for comparison
        const baseline = parseTimeString(baselineString)
        return {
            result: {
                n: convertTimeMeasure(ms, "ms", baseline.unit),
                unit: baseline.unit
            },
            baseline
        }
    }
    return {
        result: createTimeMeasure(ms),
        baseline: undefined
    }
}
