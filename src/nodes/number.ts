import type { Bounds } from "./bounds.js"
import { intersectBounds, subtractBounds } from "./bounds.js"
import { AttributeDifferenceMap, AttributeIntersectionMap } from "./node.js"

export type NumberAttributes = {
    readonly divisor?: number
    readonly bounds?: Bounds
}

export const intersectNumberAttributes = {
    divisor: (l, r) => Math.abs((l * r) / greatestCommonDivisor(l, r)),
    bounds: intersectBounds
} satisfies AttributeIntersectionMap<NumberAttributes>

export const subtractNumberAttributes = {
    divisor: (l, r) => {
        const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
        return relativelyPrimeA === 1 ? null : relativelyPrimeA
    },
    bounds: subtractBounds
} satisfies AttributeDifferenceMap<NumberAttributes>

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
