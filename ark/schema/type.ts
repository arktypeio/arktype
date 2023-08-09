import type { extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
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

	assertAllowedBy?(basis: BasisConstraint): void

	abstract intersectRules(other: this): rule | Orthogonal | Disjoint

	declare allows: (data: unknown) => boolean
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
