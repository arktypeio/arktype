import { throwInternalError } from "../utils/errors.js"
import type { listable } from "../utils/lists.js"
import { listFrom } from "../utils/lists.js"
import { ClassNode } from "./basis/class.js"
import { DomainNode } from "./basis/domain.js"
import { ValueNode } from "./basis/value.js"
import type { DivisorNode } from "./constraints/divisor.js"
import { divisorNode } from "./constraints/divisor.js"
import type { MorphNode } from "./constraints/morph.js"
import { morphNode } from "./constraints/morph.js"
import type { NarrowNode } from "./constraints/narrow.js"
import { narrowNode } from "./constraints/narrow.js"
import type { PropsNode } from "./constraints/props/props.js"
import { propsNode } from "./constraints/props/props.js"
import type { RangeNode } from "./constraints/range.js"
import { rangeNode } from "./constraints/range.js"
import type { RegexNode } from "./constraints/regex.js"
import { regexNode } from "./constraints/regex.js"
import type { ListableInputKind, PredicateNode } from "./predicate.js"
import { predicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"
import { typeNode } from "./type.js"

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
            return typeNode(unknownRule)
        case "predicate":
            return predicateNode(unknownRule)
        case "domain":
            return DomainNode(unknownRule)
        case "class":
            return ClassNode(unknownRule)
        case "value":
            return ValueNode(unknownRule)
        case "divisor":
            return divisorNode(unknownRule)
        case "range":
            return rangeNode(unknownRule)
        case "regex":
            return regexNode(listFrom(unknownRule))
        case "props":
            return propsNode(unknownRule)
        case "narrow":
            return narrowNode(listFrom(unknownRule))
        case "morph":
            return morphNode(listFrom(unknownRule))
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
