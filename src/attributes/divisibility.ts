import type { Attributes } from "./attributes.js"
import { reduceType } from "./type.js"

export const reduceDivisibility: Attributes.Reducer<[divisor: number]> = (
    base,
    divisor
) => ({
    ...reduceType(base, "number"),
    divisor:
        base.divisor !== undefined
            ? leastCommonMultiple(base.divisor, divisor)
            : divisor
})

// Calculate the GCD, then divide the product by that to determine the LCM:
// https://en.wikipedia.org/wiki/Euclidean_algorithm
const leastCommonMultiple = (first: number, second: number) => {
    let previous
    let greatestCommonDivisor = first
    let current = second
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return Math.abs((first * second) / greatestCommonDivisor)
}
