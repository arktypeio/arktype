import type { Compilation } from "../compile.ts"
import { RuleNode } from "./rule.ts"

export class DivisorRule extends RuleNode<"divisor"> {
    constructor(public readonly divisor: number) {
        super("divisor", `${divisor}`)
    }

    intersect(other: DivisorRule) {
        const leastCommonMultiple = Math.abs(
            (this.divisor * other.divisor) /
                greatestCommonDivisor(this.divisor, other.divisor)
        )
        return leastCommonMultiple === this.divisor
            ? this
            : leastCommonMultiple === other.divisor
            ? other
            : new DivisorRule(leastCommonMultiple)
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
