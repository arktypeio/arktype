import type { extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import { Disjoint } from "./disjoint.js"
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

	abstract intersectRules(other: this): rule | Orthogonal | Disjoint

	intersect(
		other: this
		// Ensure the signature of this method reflects whether Disjoint and/or null
		// are possible intersection results for the subclass.
	): this | Extract<ReturnType<this["intersectRules"]>, Orthogonal | Disjoint> {
		const ruleIntersection = this.intersectRules(other)
		if (
			ruleIntersection === orthogonal ||
			ruleIntersection instanceof Disjoint
		) {
			return ruleIntersection as never
		}
		return new (this.constructor as any)(ruleIntersection)
	}

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

export const orthogonal = Symbol(
	"Represents an intersection result between two compatible but independent constraints"
)

export type Orthogonal = typeof orthogonal

export type NodesByKind = extend<
	ConstraintsByKind,
	{
		predicate: PredicateNode
		union: UnionNode
	}
>

export type NodeKind = keyof NodesByKind
