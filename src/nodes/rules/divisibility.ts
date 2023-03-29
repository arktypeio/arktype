import type { Compilation } from "../node.ts"
import { Rule } from "./rule.ts"

export class DivisibilityRule extends Rule<"divisibility"> {
    constructor(public readonly divisor: number) {
        super("divisibility", `${divisor}`)
    }

    intersect(other: DivisibilityRule) {
        const leastCommonMultiple = Math.abs(
            (this.divisor * other.divisor) /
                greatestCommonDivisor(this.divisor, other.divisor)
        )
        return new DivisibilityRule(leastCommonMultiple)
    }

    compile(c: Compilation) {
        return c.check(
            "divisor",
            `${c.data} % ${this.divisor} === 0` as const,
            this.divisor
        )
    }
}

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
