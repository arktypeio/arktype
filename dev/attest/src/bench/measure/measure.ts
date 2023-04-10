import { isKeyOf } from "arktype/internal/utils/generics.js"
import type { StatName } from "../call.js"
import type { TimeUnit } from "./time.js"
import { stringifyTimeMeasure, TIME_UNIT_RATIOS } from "./time.js"
import type { TypeUnit } from "./types.js"

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

export const stringifyMeasure = ([value, units]: Measure) =>
    isKeyOf(units, TIME_UNIT_RATIOS)
        ? stringifyTimeMeasure([value, units])
        : `${value}${units}`
