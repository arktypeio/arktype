import { throwInternalError } from "../utils/errors.js"
import type { listable } from "../utils/lists.js"
import { listFrom } from "../utils/lists.js"
import { ClassNode } from "./basis/class.js"
import { DomainNode } from "./basis/domain.js"
import { ValueNode } from "./basis/value.js"
import { DivisorNode } from "./constraints/divisor.js"
import { MorphNode } from "./constraints/morph.js"
import { NarrowNode } from "./constraints/narrow.js"
import { PropsNode } from "./constraints/props/props.js"
import { RangeNode } from "./constraints/range.js"
import { RegexNode } from "./constraints/regex.js"
import type { ListableInputKind } from "./predicate.js"
import { PredicateNode } from "./predicate.js"
import { TypeNode } from "./type.js"

export const precedenceByKind = {
    // roots
    type: 0,
    predicate: 0,
    // basis checks
    domain: 1,
    class: 1,
    value: 1,
    // shallow checks
    range: 2,
    divisor: 2,
    regex: 2,
    // deep checks
    props: 3,
    // narrows
    narrow: 4,
    // morphs
    morph: 5
} as const satisfies Record<NodeKind, number>

export type NodeKinds = {
    type: TypeNode
    predicate: PredicateNode
    domain: DomainNode
    class: ClassNode
    value: ValueNode
    range: RangeNode
    divisor: DivisorNode
    regex: RegexNode
    props: PropsNode
    narrow: NarrowNode
    morph: MorphNode
}

export type NodeKind = keyof NodeKinds

export const createNodeOfKind = ((kind, unknownRule: any) => {
    switch (kind) {
        case "type":
            return TypeNode(unknownRule)
        case "predicate":
            return PredicateNode(unknownRule)
        case "domain":
            return DomainNode(unknownRule)
        case "class":
            return ClassNode(unknownRule)
        case "value":
            return ValueNode(unknownRule)
        case "divisor":
            return DivisorNode(unknownRule)
        case "range":
            return RangeNode(unknownRule)
        case "regex":
            return RegexNode(listFrom(unknownRule))
        case "props":
            return PropsNode(unknownRule)
        case "narrow":
            return NarrowNode(listFrom(unknownRule))
        case "morph":
            return MorphNode(listFrom(unknownRule))
        default:
            return throwInternalError(`Unexpected node kind '${kind}'`)
    }
}) as <kind extends NodeKind>(
    kind: kind,
    rule: RuleInputs[kind]
) => NodeKinds[kind]

export type RuleInputs = {
    [kind in NodeKind]: kind extends ListableInputKind
        ? listable<NodeKinds[kind]["rule"][number]>
        : NodeKinds[kind]["rule"]
}
