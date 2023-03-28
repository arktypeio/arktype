import type { Compilation } from "../compile.ts"
import { RuleNode } from "./rule.ts"

export class DivisorRule extends RuleNode<"divisor", number> {
    readonly kind = "divisor"

    intersectRule(rule: number) {
        return Math.abs(
            (this.rule * rule) / greatestCommonDivisor(this.rule, rule)
        )
    }

    serialize() {
        return `${this.rule}`
    }

    compile(c: Compilation) {
        return c.check(
            "divisor",
            `${c.data} % ${this.key} === 0` as const,
            this.rule
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
