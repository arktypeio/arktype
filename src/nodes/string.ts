import type { RegexLiteral } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import { intersectBounds, subtractBounds } from "./bounds.js"
import {
    AttributeDifferenceMapper,
    AttributeIntersectionMapper
} from "./node.js"

export type StringAttributes = {
    readonly regex?: readonly RegexLiteral[]
    readonly bounds?: Bounds
}

export const stringAttributesIntersection = {
    regex: (l, r) => {
        const result = [...l]
        for (const expression of r) {
            if (!l.includes(expression)) {
                result.push(expression)
            }
        }
        return result
    },
    bounds: intersectBounds
} satisfies AttributeIntersectionMapper<StringAttributes>

export const stringAttributesDifference = {
    regex: (l, r) => l.filter((expression) => !r.includes(expression)),
    bounds: subtractBounds
} satisfies AttributeDifferenceMapper<StringAttributes>
