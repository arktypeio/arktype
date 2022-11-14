import type { AttributeOperation } from "./operations.js"

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

export const applyDivisorOperation: AttributeOperation<"divisor"> = (
    operator,
    a,
    b
) =>
    operator === "&"
        ? Math.abs((a * b) / greatestCommonDivisor(a, b))
        : a / greatestCommonDivisor(a, b)
