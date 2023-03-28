import { hasDomain } from "../../utils/domains.ts"
import type { Compilation } from "../compile.ts"
import type { ComparisonState, DisjointContext } from "../compose.ts"

export abstract class RuleNode<
    kind extends RuleKind = RuleKind,
    rule = unknown
> {
    key: string
    abstract readonly kind: kind
    protected abstract serialize(): string

    get precedence() {
        return precedenceByRule[this.kind]
    }

    constructor(public rule: rule) {
        this.key = this.serialize()
    }

    abstract intersectRule(
        other: rule,
        s: ComparisonState
    ): rule | DisjointContext

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

export const intersectUniqueLists = <item>(
    l: readonly item[],
    r: readonly item[]
) => {
    const intersection = [...l]
    for (const item of r) {
        if (!l.includes(item)) {
            intersection.push(item)
        }
    }
    return intersection.length === l.length
        ? l
        : intersection.length === r.length
        ? r
        : intersection
}
