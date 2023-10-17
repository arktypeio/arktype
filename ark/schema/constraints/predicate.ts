import { compileSerializedValue } from "../io/compile.js"
import type { TraversalState } from "../io/traverse.js"
import type { BaseAttributes, Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { ProtoNode } from "./proto.js"
import type { BaseRefinement } from "./refinement.js"

export interface PredicateChildren<rule extends Predicate = Predicate>
	extends BaseAttributes {
	rule: rule
}

export type PredicateSchema<rule extends Predicate = Predicate> =
	| rule
	| PredicateChildren<rule>

export class PredicateNode<rule extends Predicate = Predicate>
	extends BaseConstraint<PredicateChildren<rule>>
	implements BaseRefinement
{
	readonly kind = "predicate"
	readonly defaultDescription = `valid according to ${this.rule.name}`

	static from(schema: PredicateSchema) {
		return new PredicateNode(
			typeof schema === "function" ? { rule: schema } : schema
		)
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode | ProtoNode | undefined {
		return (
			basis === undefined || basis.kind === "domain" || basis.kind === "proto"
		)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return `${this} cannot narrow ${basis}`
	}

	hash() {
		return compileSerializedValue(this.rule)
	}

	intersectSymmetric() {
		return null
	}

	intersectAsymmetric() {
		return null
	}
}

// TODO: allow changed order to be the same type

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.

export type Predicate<data = any> = (
	data: data,
	traversal: TraversalState
) => boolean

export type PredicateCast<data = any, narrowed extends data = data> = (
	data: data
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
