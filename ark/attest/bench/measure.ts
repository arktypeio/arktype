import type { StatName } from "./bench.js"

type MeasureUnit = TimeUnit | TypeUnit

export type Measure<Unit extends MeasureUnit = MeasureUnit> = [
	value: number,
	unit: Unit
]

export type MeasureComparison<Unit extends MeasureUnit = MeasureUnit> = {
	updated: Measure<Unit>
	baseline: Measure<Unit> | undefined
}

export type MarkMeasure = Partial<Record<StatName, Measure>>

export const stringifyMeasure = ([value, units]: Measure): string =>
	units in timeUnitRatios ?
		stringifyTimeMeasure([value, units as TimeUnit])
	:	`${value} ${units}`

export const TYPE_UNITS = ["instantiations"] as const

export type TypeUnit = (typeof TYPE_UNITS)[number]

export const createTypeComparison = (
	value: number,
	baseline: Measure<TypeUnit> | undefined
): MeasureComparison<TypeUnit> => ({
	updated: [value, "instantiations"],
	baseline
})

export const timeUnitRatios = {
	ns: 0.000_001,
	us: 0.001,
	ms: 1,
	s: 1000
}

export type TimeUnit = keyof typeof timeUnitRatios

export const stringifyTimeMeasure = ([
	value,
	unit
]: Measure<TimeUnit>): string => `${value.toFixed(2)}${unit}`

const convertTimeUnit = (n: number, from: TimeUnit, to: TimeUnit) =>
	round((n * timeUnitRatios[from]) / timeUnitRatios[to], 2)

/**
 * Establish a new baseline using the most appropriate time unit
 */
export const createTimeMeasure = (ms: number): Measure<TimeUnit> => {
	let bestMatch: Measure<TimeUnit> | undefined
	for (const u in timeUnitRatios) {
		const candidateMeasure = createTimeMeasureForUnit(ms, u as TimeUnit)
		if (!bestMatch) bestMatch = candidateMeasure
		else if (bestMatch[0] >= 1) {
			if (candidateMeasure[0] >= 1 && candidateMeasure[0] < bestMatch[0])
				bestMatch = candidateMeasure
		} else if (candidateMeasure[0] >= bestMatch[0]) bestMatch = candidateMeasure
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
