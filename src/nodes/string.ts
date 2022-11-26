import type { RegexLiteral, xor } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import { boundsOperations, checkBounds } from "./bounds.js"
import {
    intersectAdditivePrimitiveSets,
    subtractPrimitiveSets
} from "./primitives.js"
import type { DataTypeOperations } from "./shared.js"

export type StringAttributes = xor<
    {
        readonly regex?: readonly RegexLiteral[]
        readonly bounds?: Bounds
    },
    { readonly values?: readonly string[] }
>

const regexCache: Record<RegexLiteral, RegExp> = {}

export const checkString = (attributes: StringAttributes, data: string) => {
    if (attributes.bounds && !checkBounds(attributes.bounds, data)) {
        return false
    }
    if (attributes.regex) {
        for (const expression of attributes.regex) {
            if (!regexCache[expression]) {
                regexCache[expression] = new RegExp(expression.slice(1, -1))
            }
            if (!regexCache[expression].test(data)) {
                return false
            }
        }
    }
    return true
}

export const stringAttributes: DataTypeOperations<StringAttributes> = {
    bounds: boundsOperations,
    regex: {
        intersect: intersectAdditivePrimitiveSets,
        subtract: subtractPrimitiveSets
    }
}
