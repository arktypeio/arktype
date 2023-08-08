import type { extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { ConstraintsByKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import type { UnionNode } from "./union.js"

export abstract class TypeNode<
	rule = unknown,
	attributes extends AttributesRecord = UniversalAttributes
> {
	constructor(
		public rule: rule,
		public attributes: attributes
	) {}

	abstract readonly kind: string
	abstract readonly id: string

	abstract writeDefaultDescription(): string

	abstract intersectRules(other: this): rule | Orthogonal | Disjoint

	hasKind<kind extends NodeKind>(kind: kind): this is NodesByKind[kind] {
		return this.kind === kind
	}

	// Ensure the signature of this method reflects whether Disjoint and/or null
	// are possible intersection results for the subclass.
	intersect(
		other: this
	): this | Extract<ReturnType<this["intersectRules"]>, null | Disjoint> {
		const ruleIntersection = this.intersectRules(other)
		if (
			ruleIntersection === orthogonal ||
			ruleIntersection instanceof Disjoint
		) {
			return ruleIntersection as never
		}
		return new (this.constructor as any)(ruleIntersection)
	}

	equals(other: TypeNode) {
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

export const orthogonal = Symbol(
	"Represents an intersection result that cannot be reduced"
)

export type Orthogonal = typeof orthogonal
