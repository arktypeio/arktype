import type { AttributeIntersector } from "./intersect.js"
import type { AttributeSubtractor } from "./subtract.js"

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

export const intersectDivisors: AttributeIntersector<"divisor"> = (a, b) =>
    Math.abs((a * b) / greatestCommonDivisor(a, b))

export const subtractDivisors: AttributeSubtractor<"divisor"> = (a, b) => {
    const relativePrimeOfA = Math.abs(a / greatestCommonDivisor(a, b))
    return relativePrimeOfA === 1 ? null : relativePrimeOfA
}
