import type { AllowedImplications, KeyReducer } from "./shared.js"

export namespace Divisible {
    const implications: AllowedImplications<"divisible"> = { typed: "number" }

    export const reduce: KeyReducer<"divisible"> = (base, divisor) => {
        if (base === undefined) {
            return [divisor, implications]
        }
        return base === divisor
            ? []
            : [leastCommonMultiple(base, divisor), implications]
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
