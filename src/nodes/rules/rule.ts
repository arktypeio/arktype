import type { Compilation } from "../compile"
import type { Comparison, ComparisonState } from "../compose"

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

export abstract class SetRule<
    kind extends RuleKind = RuleKind,
    item = unknown
> extends RuleNode<kind, Set<item>> {
    compare(rule: Set<item>, s: ComparisonState): Comparison<Set<item>> {
        const intersection = new Set([...this.rule, ...rule])
        return intersection.size === this.rule.size
            ? rule.size === intersection.size
                ? s.equality(intersection)
                : s.subtype(this.rule)
            : rule.size === intersection.size
            ? s.supertype(rule)
            : s.overlap(intersection)
    }
}
