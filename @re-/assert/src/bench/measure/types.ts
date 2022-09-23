import type { ElementOf } from "@re-/tools"
import { toNumber } from "@re-/tools"
import type { Measure, MeasureComparison } from "./measure.js"

// "in" === Instantiations
export const TYPE_UNITS = ["in"] as const

export type TypeUnit = ElementOf<typeof TYPE_UNITS>

// Using bigint here excludes non-integer values
export type TypeString = `${bigint}${TypeUnit}`

const typeStringRegex = new RegExp(`^0|[1-9]\\d*(${TYPE_UNITS.join("|")})$`)

const assertTypeString: (s: string) => asserts s is TypeString = (
    s: string
) => {
    if (!typeStringRegex.test(s)) {
        throw new Error(
            `Bench type measure '${s}' must be of the format "<integer><${TYPE_UNITS.join(
                "|"
            )}>".`
        )
    }
}

export const parseTypeMeasureString = (s: TypeString): Measure<TypeUnit> => {
    assertTypeString(s)
    const value = toNumber(s.slice(0, -2))
    const unit = s.slice(-2) as TypeUnit
    return [value, unit]
}

export const stringifyTypeMeasure = ([value, unit]: Measure<TypeUnit>) =>
    `${value}${unit}` as TypeString

export const createTypeComparison = (
    value: number,
    baselineString: TypeString | undefined
): MeasureComparison<TypeUnit> => {
    return {
        updated: [value, "in"],
        baseline: baselineString
            ? parseTypeMeasureString(baselineString)
            : undefined
    }
}
