import type { Bounds } from "./bounds.js"
import { SetOperations } from "./node.js"

export type NumberAttributes = {
    divisor?: number
    bounds?: Bounds
}

const divisor = {
    intersection: (a: number, b: number) =>
        Math.abs((a * b) / greatestCommonDivisor(a, b)),
    difference: (a, b) => {
        const relativelyPrimeA = Math.abs(a / greatestCommonDivisor(a, b))
        return relativelyPrimeA === 1 ? undefined : relativelyPrimeA
    }
} satisfies SetOperations<number>

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (a: number, b: number) => {
    let previous
    let greatestCommonDivisor = a
    let current = b
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}
