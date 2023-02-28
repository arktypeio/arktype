import type { Measure, MeasureComparison } from "./measure.ts"

export const TYPE_UNITS = ["instantiations"] as const

export type TypeUnit = (typeof TYPE_UNITS)[number]

export const createTypeComparison = (
    value: number,
    baseline: Measure<TypeUnit> | undefined
): MeasureComparison<TypeUnit> => {
    return {
        updated: [value, "instantiations"],
        baseline
    }
}
