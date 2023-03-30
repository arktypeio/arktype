import type { Compilation } from "../node.ts"
import { Rule } from "./rule.ts"

export class DivisibilityRule extends Rule<"divisibility"> {
    constructor(public readonly definition: number) {
        super("divisibility", `${definition}`)
    }

    intersect(other: DivisibilityRule) {
        const leastCommonMultiple = Math.abs(
            (this.definition * other.definition) /
                greatestCommonDivisor(this.definition, other.definition)
        )
        return new DivisibilityRule(leastCommonMultiple)
    }

    compile(c: Compilation) {
        return c.check(
            "divisor",
            `${c.data} % ${this.definition} === 0` as const,
            this.definition
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
