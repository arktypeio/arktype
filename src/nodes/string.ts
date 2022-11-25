import type { RegexLiteral } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import { boundsOperations } from "./bounds.js"
import {
    intersectAdditivePrimitives,
    subtractPrimitiveSets
} from "./primitives.js"
import { DataTypeOperations } from "./shared.js"

export type StringAttributes = {
    readonly regex?: readonly RegexLiteral[]
    readonly bounds?: Bounds
}

const regexCache: Record<RegexLiteral, RegExp> = {}

export const stringAttributes = {
    bounds: boundsOperations,
    regex: {
        intersect: intersectAdditivePrimitives,
        subtract: subtractPrimitiveSets,
        check: (expressions, data) =>
            expressions.every((expression) => {
                if (regexCache[expression]) {
                    regexCache[expression] = new RegExp(expression.slice(1, -1))
                }
                return regexCache[expression].test(data)
            })
    }
} satisfies DataTypeOperations<StringAttributes, string>
