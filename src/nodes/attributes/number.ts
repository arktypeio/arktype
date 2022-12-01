import { composeIntersection } from "../compose.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection, checkBounds } from "./bounds.js"

export type NumberAttributes = {
    readonly type: "number"
    readonly divisor?: number
    readonly bounds?: Bounds
    readonly literal?: number
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.literal
        ? attributes.literal === data
        : (!attributes.bounds || checkBounds(data, attributes.bounds)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

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

export const numberIntersection = composeIntersection<NumberAttributes>({
    literal: checkNumber,
    divisor: leastCommonMultiple,
    bounds: boundsIntersection
})
