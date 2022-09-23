import type { ElementOf } from "@re-/tools"
import type { Measure, MeasureComparison } from "./measure.js"

export const TYPE_UNITS = ["instantiations"] as const

export type TypeUnit = ElementOf<typeof TYPE_UNITS>

export const createTypeComparison = (
    value: number,
    baseline: Measure<TypeUnit> | undefined
): MeasureComparison<TypeUnit> => {
    return {
        updated: [value, "instantiations"],
        baseline
    }
}
