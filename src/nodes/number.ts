import type { Bounds } from "./bounds.js"
import { boundsOperations } from "./bounds.js"
import { AttributeOperations, DataTypeOperations } from "./shared.js"

export type NumberAttributes = {
    readonly divisor?: number
    readonly bounds?: Bounds
}

export const divisorOperations = {
    intersect: (l, r) => Math.abs((l * r) / greatestCommonDivisor(l, r)),
    subtract: (l, r) => {
        const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
        return relativelyPrimeA === 1 ? null : relativelyPrimeA
    },
    check: (divisor, data) => data % divisor === 0
} satisfies AttributeOperations<number, number>

export const numberAttributes = {
    bounds: boundsOperations,
    divisor: divisorOperations
} satisfies DataTypeOperations<NumberAttributes, number>

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
