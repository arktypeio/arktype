import type { Dict } from "@arktype/utils"
import { PredicateNode } from "./predicate/predicate.js"
import type { BasisKind } from "./primitive/basis.js"
import { BoundNode } from "./primitive/bound.js"
import { ClassNode } from "./primitive/class.js"
import { DivisorNode } from "./primitive/divisor.js"
import { DomainNode } from "./primitive/domain.js"
import { NarrowNode } from "./primitive/narrow.js"
import { RegexNode } from "./primitive/regex.js"
import { UnitNode } from "./primitive/unit.js"
import { PropsNode } from "./prop/props.js"
import { TypeNode } from "./type.js"

const nodeConstructors = {
	type: TypeNode,
	domain: DomainNode,
	class: ClassNode,
	unit: UnitNode,
	bound: BoundNode,
	divisor: DivisorNode,
	regex: RegexNode,
	narrow: NarrowNode,
	predicate: PredicateNode,
	props: PropsNode
}

type NodeConstructors = typeof nodeConstructors
export type NodeKind = keyof NodeConstructors

export type NodeKinds = {
	[k in NodeKind]: InstanceType<NodeConstructors[k]>
}

export type NodeIntersections = {
	[k in NodeKind]: Parameters<NodeKinds[k]["intersect"]>[0]
}

export type UnknownNodeInput = readonly [
	kind: NodeKind,
	rule: unknown,
	meta: Dict
]

export type Node<kind extends NodeKind = NodeKind> = NodeKinds[kind]

export const createNode = (input: UnknownNodeInput): Node =>
	new (nodeConstructors[input[0]] as any)(input[1], input[2])
