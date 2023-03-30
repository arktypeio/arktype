import { Node } from "../node.ts"
import type { DivisibilityNode } from "./divisibility.ts"
import type { DomainNode } from "./domain.ts"
import type { EqualityNode } from "./equality.ts"
import type { InstanceNode } from "./instance.ts"
import type { NarrowNode } from "./narrow.ts"
import type { PropsNode } from "./props.ts"
import type { RangeNode } from "./range.ts"
import type { RegexNode } from "./regex.ts"

type RuleKinds = {
    domain: DomainNode
    equality: EqualityNode
    instance: InstanceNode
    range: RangeNode
    divisibility: DivisibilityNode
    regex: RegexNode
    props: PropsNode
    narrow: NarrowNode
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
