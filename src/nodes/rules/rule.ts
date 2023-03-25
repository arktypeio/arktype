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
    value: 0,
    instance: 1,
    range: 2,
    divisor: 3,
    regex: 4,
    props: 5,
    narrow: 6
} as const satisfies Record<string, number>

export type PrecedenceByRule = typeof precedenceByRule

export type RuleKind = keyof PrecedenceByRule
