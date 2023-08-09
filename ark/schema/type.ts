import type { extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { UnionNode } from "./union.js"

export abstract class BaseNode<
	rule = unknown,
	attributes extends AttributesRecord = UniversalAttributes
> {
	protected constructor(
		public rule: rule,
		public attributes: attributes
	) {}

	abstract readonly kind: string
	declare readonly id: string

	abstract writeDefaultDescription(): string

	abstract intersect(other: this): this | Disjoint

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
