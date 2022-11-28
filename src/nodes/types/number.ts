import { isEmpty } from "../../utils/deepEquals.js"
import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { checkBounds, compareBounds, pruneBounds } from "../bounds.js"
import type {
    Compare,
    Comparison,
    Intersection,
    Subcompare,
    UnfinalizedComparison
} from "../node.js"
import { isNever } from "./degenerate.js"
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
    compareDivisors(l.divisor, r.divisor, comparison)
    if (l.bounds && r.bounds) {
        const boundsResult = compareBounds(l.bounds, r.bounds)
        if (isNever(boundsResult)) {
            return boundsResult
        }
        comparison.bounds = boundsResult
    }
    return comparison
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.literal
        ? attributes.literal === data
        : (!attributes.bounds || checkBounds(data, attributes.bounds)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

const compareDivisors = createSubcomparison<NumberAttributes, "divisor">(
    "divisor",
    (l, r, comparison) => {
        if (l % r === 0) {
            comparison[1].divisor = l
            if (l !== r) {
                comparison[0].divisor = l
            }
        } else if (r % l === 0) {
            comparison[1].divisor = r
            comparison[2].divisor = r
        } else {
            comparison[0].divisor = l
            comparison[1].divisor = leastCommonMultiple(l, r)
            comparison[2].divisor = r
        }
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
