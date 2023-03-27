import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"
import { RuleNode } from "./rule.ts"

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

export class DivisorRule extends RuleNode<"divisor", number> {
    compare(rule: number, s: ComparisonState): Comparison<number> {}

    compile(c: Compilation) {
        return c.check(
            "divisor",
            `${c.data} % ${divisor} === 0` as const,
            divisor
        )
    }
}
