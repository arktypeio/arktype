import type { TraversalState } from "../io/traverse.js"
import { type BaseAttributes, BaseNode, type Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import { getBasisName } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { ProtoNode } from "./proto.js"
import type { BaseRefinement } from "./refinement.js"

export interface PredicateChildren<rule extends Predicate = Predicate>
	extends BaseAttributes {
	predicate: rule
}

export type PredicateSchema<rule extends Predicate = Predicate> =
	| rule
	| PredicateChildren<rule>

export class PredicateNode<rule extends Predicate = Predicate>
	extends BaseNode<PredicateChildren<rule>, typeof PredicateNode>
	implements BaseRefinement
{
	static readonly kind = "predicate"

	static keyKinds = this.declareKeys({
		predicate: "in"
	})

	static intersections = this.defineIntersections({
		predicate: () => null
	})

	// id
	// compileSerializedValue(this.rule)

	static from(schema: PredicateSchema) {
		return new PredicateNode(
			typeof schema === "function" ? { predicate: schema } : schema
		)
	}

	static writeDefaultDescription(children: PredicateChildren) {
		return `valid according to ${children.predicate.name}`
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode | ProtoNode | undefined {
		return (
			basis === undefined || basis.kind === "domain" || basis.kind === "proto"
		)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return `${this} cannot narrow ${getBasisName(basis)}`
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
