import type { DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"

// TODO: Think about concrete situations with these.

export const compressUnion = (
    { ...left }: Attributes,
    { ...right }: Attributes
) => {
    const intersection: Attributes = { ...left, ...right }
    let k: keyof Attributes
    for (k in intersection) {
        if (left[k] === right[k]) {
            intersection[k] = left[k] as any
            delete left[k]
            delete right[k]
        } else {
            delete intersection[k]
        }
    }
    return [intersection, left, right]
}

export const distributableIntersection = (
    left: Attributes,
    right: Attributes
) => {
    const intersection: Attributes = {}
    let k: keyof Attributes
    for (k in intersection) {
        if (left[k] === right[k]) {
            intersection[k] = left[k] as any
        }
    }
    return intersection
}

type Attributes = Partial<{
    // Fixed
    value: string | number | boolean | bigint | null | undefined
    type: DynamicTypeName
    // Merged
    divisor: number
    regex: Enclosed.RegexLiteral
    // Merged (possible never)
    min: `${">" | ">="}${number}`
    max: `${"<" | "<="}${number}`
}>
