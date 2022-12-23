import type { Measure, MeasureComparison } from "./measure.ts"

export const TIME_UNIT_RATIOS = Object.freeze({
    ns: 0.000_001,
    us: 0.001,
    ms: 1,
    s: 1000
})

export type TimeUnit = keyof typeof TIME_UNIT_RATIOS

export const stringifyTimeMeasure = ([value, unit]: Measure<TimeUnit>) =>
    `${value.toFixed(2)}${unit}`

const convertTimeUnit = (n: number, from: TimeUnit, to: TimeUnit) => {
    return round((n * TIME_UNIT_RATIOS[from]) / TIME_UNIT_RATIOS[to], 2)
}

/**
 * Establish a new baseline using the most appropriate time unit
 */
export const createTimeMeasure = (ms: number) => {
    let bestMatch: Measure<TimeUnit> | undefined
    for (const u in TIME_UNIT_RATIOS) {
        const candidateMeasure = createTimeMeasureForUnit(ms, u as TimeUnit)
        if (!bestMatch) {
            bestMatch = candidateMeasure
        } else if (bestMatch[0] >= 1) {
            if (
                candidateMeasure[0] >= 1 &&
                candidateMeasure[0] < bestMatch[0]
            ) {
                bestMatch = candidateMeasure
            }
        } else {
            if (candidateMeasure[0] >= bestMatch[0]) {
                bestMatch = candidateMeasure
            }
        }
    }
    return bestMatch!
}

const createTimeMeasureForUnit = (
    ms: number,
    unit: TimeUnit
): Measure<TimeUnit> => [convertTimeUnit(ms, "ms", unit), unit]

const round = (value: number, decimalPlaces: number) =>
    Math.round(value * 10 ** decimalPlaces) / 10 ** decimalPlaces

export const createTimeComparison = (
    ms: number,
    baseline: Measure<TimeUnit> | undefined
): MeasureComparison<TimeUnit> => {
    if (baseline) {
        return {
            updated: [convertTimeUnit(ms, "ms", baseline[1]), baseline[1]],
            baseline
        }
    }
    return {
        updated: createTimeMeasure(ms),
        baseline: undefined
    }
}
