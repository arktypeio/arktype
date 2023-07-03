import type { extend } from "../../dev/utils/src/main.js"
import { cached } from "../../dev/utils/src/main.js"
import type { PredicateNode } from "./composite/predicate.js"
import { predicateNode } from "./composite/predicate.js"
import type { PropsNode } from "./composite/props.js"
import { propsNode } from "./composite/props.js"
import type { TypeNode } from "./composite/type.js"
import { typeNode } from "./composite/type.js"
import type { NodeConstructor } from "./node.js"
import type { ClassNode } from "./primitive/basis/class.js"
import { classNode } from "./primitive/basis/class.js"
import type { DomainNode } from "./primitive/basis/domain.js"
import { domainNode } from "./primitive/basis/domain.js"
import type { ValueNode } from "./primitive/basis/value.js"
import { valueNode } from "./primitive/basis/value.js"
import type { DivisorNode } from "./primitive/divisor.js"
import { divisorNode } from "./primitive/divisor.js"
import type { MorphNode } from "./primitive/morph.js"
import { morphNode } from "./primitive/morph.js"
import type { NarrowNode } from "./primitive/narrow.js"
import { narrowNode } from "./primitive/narrow.js"
import type { RangeNode } from "./primitive/range.js"
import { rangeNode } from "./primitive/range.js"
import type { RegexNode } from "./primitive/regex.js"
import { regexNode } from "./primitive/regex.js"

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

export type Node = NodeKinds[NodeKind]

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

const nodeKinds = cached(
    () =>
        ({
            type: typeNode,
            predicate: predicateNode,
            domain: domainNode,
            class: classNode,
            value: valueNode,
            range: rangeNode,
            divisor: divisorNode,
            regex: regexNode,
            props: propsNode,
            narrow: narrowNode,
            morph: morphNode
        } satisfies { [k in NodeKind]: NodeConstructor<NodeKinds[k], never> })
)

export type CompositeNodeKind = extend<NodeKind, "type" | "predicate" | "props">

type NodeConstructors = { [k in NodeKind]: ReturnType<typeof nodeKinds>[k] }

export type NodeInputs = { [k in NodeKind]: Parameters<NodeConstructors[k]>[0] }

export const createNodeOfKind = <kind extends NodeKind>(
    kind: kind,
    input: NodeInputs[kind]
) => nodeKinds()[kind](input as never) as NodeKinds[kind]
