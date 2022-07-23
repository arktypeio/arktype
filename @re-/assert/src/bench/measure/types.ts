import { asNumber, ElementOf } from "@re-/tools"
import { Measure, MeasureComparison } from "./measure.js"

export const TYPE_UNITS = ["instantiations"] as const

export type TypeUnit = ElementOf<typeof TYPE_UNITS>

// Using bigint here excludes non-integer values
export type TypeString = `${bigint} ${TypeUnit}`

const typeStringRegex = new RegExp(`^0|[1-9]\\d*\\s(${TYPE_UNITS.join("|")})$`)

const assertTypeString: (s: string) => asserts s is TypeString = (
    s: string
) => {
    if (!typeStringRegex.test(s)) {
        throw new Error(
            `Bench type measure '${s}' must be of the format "<integer><space><${TYPE_UNITS.join(
                "|"
            )}>".`
        )
    }
}

export const parseTypeString = (s: TypeString): Measure<TypeUnit> => {
    assertTypeString(s)
    const parts = s.split(" ")
    const n = asNumber(parts[0], { assert: true })
    const unit = parts[1] as TypeUnit
    return {
        n,
        unit
    }
}

export const stringifyTypeMeasure = (m: Measure<TypeUnit>) =>
    `${m.n} ${m.unit}` as TypeString

export const createTypeComparison = (
    n: number,
    baselineString: TypeString | undefined
): MeasureComparison<TypeUnit> => {
    return {
        result: {
            n,
            unit: "instantiations"
        },
        baseline: baselineString ? parseTypeString(baselineString) : undefined
    }
}
