import type { TimeUnit } from "./time.js"
import { stringifyTimeMeasure } from "./time.js"
import type { TypeUnit } from "./types.js"
import { stringifyTypeMeasure, TYPE_UNITS } from "./types.js"

type MeasureUnit = TimeUnit | TypeUnit

export type Measure<Unit extends MeasureUnit = MeasureUnit> = [
    value: number,
    unit: Unit
]

export type MeasureComparison<Unit extends MeasureUnit = MeasureUnit> = {
    updated: Measure<Unit>
    baseline: Measure<Unit> | undefined
}

export const stringifyMeasure = (m: Measure) =>
    TYPE_UNITS.includes(m[1] as any)
        ? stringifyTypeMeasure(m as Measure<TypeUnit>)
        : stringifyTimeMeasure(m as Measure<TimeUnit>)
