import type { xor } from "../../utils/generics.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection, checkBounds } from "./bounds.js"
import { literalableIntersection } from "./literals.js"
import type { AttributesIntersection } from "./utils.js"
import { createIntersectionForKey } from "./utils.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly literal?: number }
>

export const numberIntersection: AttributesIntersection<NumberAttributes> = (
    l,
    r
) => {
    const literalResult = literalableIntersection(l, r, checkNumber)
    if (literalResult) {
        return literalResult
    }
    return boundsIntersection(divisorIntersection({}, l, r), l, r)
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.literal
        ? attributes.literal === data
        : (!attributes.bounds || checkBounds(data, attributes.bounds)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

const leastCommonMultiple = (l: number, r: number) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))

const divisorIntersection = createIntersectionForKey<
    NumberAttributes,
    "divisor"
>("divisor", leastCommonMultiple)

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
    let previous
    let greatestCommonDivisor = l
    let current = r
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}
