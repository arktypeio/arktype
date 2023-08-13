import type { extend } from "@arktype/util"
import type { AttributeRecord } from "./attributes/attribute.js"
import type { Disjoint } from "./disjoint.js"
import type { ConstraintsByKind, PredicateNode } from "./predicate.js"
import type { UnionNode } from "./union.js"

export interface NodeConfig<rule = unknown> {
	rule: rule
	attributes: AttributeRecord
	disjoinable: boolean
}

export type disjointIfAllowed<config extends { disjoinable: boolean }> =
	config["disjoinable"] extends true ? Disjoint : never

export abstract class BaseNode<config extends NodeConfig = NodeConfig> {
	protected constructor(
		public rule: config["rule"],
		public attributes: config["attributes"]
	) {}

	abstract readonly kind: NodeKind
	declare readonly id: string

	abstract writeDefaultDescription(): string

	hasKind<kind extends NodeKind>(kind: kind): this is NodesByKind[kind] {
		return this.kind === kind
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}

	toString() {
		return this.attributes.description ?? this.writeDefaultDescription()
	}
}

export type NodesByKind = extend<
	ConstraintsByKind,
	{
		predicate: PredicateNode
		union: UnionNode
	}
>

export type NodeKind = keyof NodesByKind
