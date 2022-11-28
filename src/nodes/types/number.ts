import type { xor } from "../../utils/generics.js"
import type { Compare } from "../node.js"
import type { Bounds } from "./bounds.js"
import { addBoundsComparison, checkBounds } from "./bounds.js"
import { createSubcomparison, initializeComparison } from "./utils.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly literal?: number }
>

export const compareNumbers: Compare<NumberAttributes> = (l, r) => {
    // TODO: Abstraction
    if (l.literal !== undefined) {
        if (r.literal !== undefined) {
            return l.literal === r.literal
                ? [null, { literal: l.literal }, null]
                : [l, null, r]
        }
        return checkNumber(l.literal, r) ? [l, l, null] : [l, null, r]
    }
    if (r.literal !== undefined) {
        return checkNumber(r.literal, l) ? [null, r, r] : [l, null, r]
    }
    const comparison = initializeComparison<NumberAttributes>()
    compareDivisors(l, r, comparison)
    addBoundsComparison(l, r, comparison)
    return comparison
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.literal
        ? attributes.literal === data
        : (!attributes.bounds || checkBounds(data, attributes.bounds)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

const compareDivisors = createSubcomparison<NumberAttributes, "divisor">(
    "divisor",
    (l, r) => {
        if (l % r === 0) {
            return [l === r ? null : l, l, null]
        }
        if (r % l === 0) {
            return [null, r, r]
        }
        return [l, leastCommonMultiple(l, r), r]
    }
)

const leastCommonMultiple = (l: number, r: number) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))

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
