import type { Compilation } from "../compile"
import type { Comparison, ComparisonState } from "../compose.ts"

export abstract class RuleNode<
    kind extends RuleKind = RuleKind,
    rule = unknown
> {
    abstract readonly kind: kind

    get precedence() {
        return precedenceByRule[this.kind]
    }

    constructor(public rule: rule) {}

    abstract compare(rule: rule, s: ComparisonState): Comparison<rule>

    abstract compile(c: Compilation): string
}

const precedenceByRule = {
    base: 0,
    range: 1,
    divisor: 2,
    regex: 3,
    props: 4,
    narrow: 5
} as const satisfies Record<string, number>

export type PrecedenceByRule = typeof precedenceByRule

export type RuleKind = keyof PrecedenceByRule
