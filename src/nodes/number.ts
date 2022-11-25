import { isEmpty } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import type { Never } from "./node.js"
import type { NodeOperator } from "./operations.js"
import type { AttributeDifference, AttributeIntersection } from "./shared.js"

export type NumberAttributes = {
    readonly divisor?: number
    readonly bounds?: Bounds
}

export const numberOperations = (
    operator: NodeOperator,
    l: NumberAttributes,
    r: NumberAttributes
): NumberAttributes | Never | true => {
    const result: mutable<NumberAttributes> = {}
    // const divisor =
    //     l.divisor !== undefined
    //         ? r.divisor !== undefined
    //             ? divisorOperations[operator](l.divisor, r.divisor)
    //             : l.divisor
    //         : r.divisor ?? null
    // if (divisor !== null) {
    //     result.divisor = divisor
    // }
    // const bounds = l.bounds
    //     ? r.bounds
    //         ? boundsOperations[operator](l.bounds, r.bounds)
    //         : l.bounds
    //     : r.bounds ?? null
    // if (bounds !== null) {
    //     // TODO: Fix
    //     if ((bounds as any).degenerate) {
    //         return bounds as Never
    //     }
    //     result.bounds = bounds
    // }
    return isEmpty(result) ? true : result
}

const intersectDivisors: AttributeIntersection<number> = (l, r) =>
    Math.abs((l * r) / greatestCommonDivisor(l, r))

const subtractDivisors: AttributeDifference<number> = (l, r) => {
    const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
    return relativelyPrimeA === 1 ? null : relativelyPrimeA
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
