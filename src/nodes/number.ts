import type { Bounds } from "./bounds.js"
import { keywords } from "./keywords.js"
import { SetOperations } from "./shared.js"

export type NumberAttributes = {
    readonly divisor?: number
    readonly bounds?: Bounds
}

const divisor = {
    intersection: (l: number, r: number) =>
        Math.abs((l * r) / greatestCommonDivisor(l, r)),
    difference: (l, r) => {
        const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
        return relativelyPrimeA === 1 ? keywords.unknown : relativelyPrimeA
    }
} satisfies SetOperations<number>

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
