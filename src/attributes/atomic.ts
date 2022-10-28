import type { DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"

export type DiffResult = {
    diverging: DivergingAttributes
    intersecting: Attributes
}

export const compare = (left: Attributes, right: Attributes) => {
    const diverging: DivergingAttributes = {}
    const intersecting = { ...left, ...right }
    let k: keyof Attributes
    for (k in intersecting) {
        if (k in left && k in right) {
            if (left[k] !== right[k]) {
                diverging[k] = [left[k], right[k]] as any
                delete intersecting[k]
            }
            delete left[k]
            delete right[k]
        } else {
            delete intersecting[k]
        }
    }
}

export type UnionResult = [
    left: Attributes,
    intersection: Attributes,
    right: Attributes
]

export const union = (left: Attributes, right: Attributes) => {
    const intersection = { ...left, ...right }
    let k: keyof Attributes
    for (k in intersection) {
        if (left[k] === right[k]) {
            delete left[k]
            delete right[k]
        }
    }
    return [left, intersection, right]
}

type DivergingAttributes = {
    [k in keyof Attributes]: [Attributes[k], Attributes[k]]
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
