import { Node } from "../node.ts"
import type { DivisibilityRule } from "./divisibility.ts"
import type { DomainRule } from "./domain.ts"
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
}

type RuleKinds = {
    domain: DomainRule
    equality: EqualityRule
    instance: InstanceRule
    range: RangeRule
    divisibility: DivisibilityRule
    regex: RegexRule
    props: PropsRule
    narrow: NarrowRule
}

export type RuleKind = keyof RuleKinds

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
