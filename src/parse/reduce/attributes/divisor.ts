import { defineOperations } from "./attributes.js"

const leastCommonMultiple = (a: number, b: number) =>
    Math.abs((a * b) / greatestCommonDivisor(a, b))

export const divisor = defineOperations<number>()({
    intersect: leastCommonMultiple,
    extract: (a, b) => (a === b ? a : null),
    exclude: (a, b) => {
        const relativelyPrimeA = Math.abs(a / greatestCommonDivisor(a, b))
        return relativelyPrimeA === 1 ? null : relativelyPrimeA
    }
})

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
