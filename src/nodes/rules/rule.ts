import { Node } from "../node.ts"
import type { DivisibilityRule } from "./divisibility.ts"
import type { EqualityRule } from "./equality.ts"
import type { InstanceRule } from "./instance.ts"
import type { NarrowRule } from "./narrow.ts"
import type { PropsRule } from "./props.ts"
import type { RangeRule } from "./range.ts"
import type { RegexRule } from "./regex.ts"

export abstract class Rule<kind extends RuleKind = RuleKind> extends Node<
    RuleKinds[kind]
> {
    constructor(public readonly kind: kind, id: string) {
        super(id)
    }

    allows(value: unknown) {
        return !value
    }

    get precedence() {
        return precedenceByRule[this.kind]
    }
}

type RuleKinds = {
    equality: EqualityRule
    instance: InstanceRule
    range: RangeRule
    divisibility: DivisibilityRule
    regex: RegexRule
    props: PropsRule
    narrow: NarrowRule
}

export type RuleKind = keyof RuleKinds

const precedenceByRule = {
    equality: 0,
    instance: 1,
    range: 2,
    divisibility: 3,
    regex: 4,
    props: 5,
    narrow: 6
} as const satisfies Record<RuleKind, number>

export type PrecedenceByRule = typeof precedenceByRule

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
    return intersection
}
