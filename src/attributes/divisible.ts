import type { AttributeReducer } from "./shared.js"

export namespace Divisible {
    export const reduce: AttributeReducer<"divisible"> = (base, divisor) => {
        if (base === undefined) {
            return [divisor, { typed: "number" }]
        }
        return base === divisor ? [] : [leastCommonMultiple(base, divisor)]
    }

    // Calculate the GCD, then divide the product by that to determine the LCM:
    // https://en.wikipedia.org/wiki/Euclidean_algorithm
    const leastCommonMultiple = (x: number, y: number) => {
        let previous
        let greatestCommonDivisor = x
        let current = y
        while (current !== 0) {
            previous = current
            current = greatestCommonDivisor % current
            greatestCommonDivisor = previous
        }
        return Math.abs((x * y) / greatestCommonDivisor)
    }
}
