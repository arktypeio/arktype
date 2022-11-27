import { isEmpty } from "../../utils/deepEquals.js"
import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { boundsIntersection, checkBounds, pruneBounds } from "../bounds.js"
import type { IntersectionFn, PruneFn } from "../node.js"
import { isNever } from "./degenerate.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly literal?: number }
>

export const numberIntersection: IntersectionFn<NumberAttributes> = (l, r) => {
    // TODO: Abstraction
    if (l.literal !== undefined || r.literal !== undefined) {
        const literal = l.literal ?? r.literal!
        const attributes = l.literal ? r : l
        return checkNumber(literal, attributes)
            ? l
            : {
                  never: `'${literal}' is not allowed by '${JSON.stringify(
                      r
                  )}' have no overlap`
              }
    }
    const result = { ...l, ...r } as mutable<NumberAttributes>
    if (l.divisor && r.divisor) {
        result.divisor = intersectDivisors(l.divisor, r.divisor)
    }
    if (l.bounds && r.bounds) {
        const boundsResult = boundsIntersection(l.bounds, r.bounds)
        if (isNever(boundsResult)) {
            return boundsResult
        }
        result.bounds = boundsResult
    }
    return result
}

export const pruneNumber: PruneFn<NumberAttributes> = (l, r) => {
    if (l.literal !== undefined) {
        return r.literal === l.literal ? undefined : l
    }
    if (r.literal !== undefined) {
        return checkNumber(r.literal, l) ? undefined : null
    }
    const result: mutable<NumberAttributes> = {}
    if (l.divisor && r.divisor) {
        const divisor = pruneDivisors(l.divisor, r.divisor)
        if (divisor) {
            result.divisor = divisor
        }
    }
    if (l.bounds && r.bounds) {
        const bounds = pruneBounds(l.bounds, r.bounds)
        if (bounds) {
            result.bounds = bounds
        }
    }
    if (!isEmpty(result)) {
        return result
    }
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.literal
        ? attributes.literal === data
        : (!attributes.bounds || checkBounds(attributes.bounds, data)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

const intersectDivisors = (l: number | undefined, r: number | undefined) =>
    l && r ? Math.abs((l * r) / greatestCommonDivisor(l, r)) : l ?? r

const pruneDivisors = (l: number | undefined, r: number | undefined) => {
    if (!l) {
        return undefined
    }
    if (!r) {
        return l
    }
    const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
    return relativelyPrimeA === 1 ? undefined : relativelyPrimeA
}

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
