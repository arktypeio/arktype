import type { AttributeIntersection } from "./intersection.js"

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

export const applyDivisorIntersection: AttributeIntersection<"divisor"> = (
    a,
    b
) => Math.abs((a * b) / greatestCommonDivisor(a, b))

export const applyDivisorDifference = (a: number, b: number) =>
    a / greatestCommonDivisor(a, b)
