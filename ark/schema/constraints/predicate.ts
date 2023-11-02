import { BaseNode, type declareNode, type withAttributes } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import { builtins } from "../builtins.js"
import { compileSerializedValue } from "../io/compile.js"
import type { TraversalState } from "../io/traverse.js"
import { type Node } from "../nodes.js"
import { type IntersectionNode } from "../sets/intersection.js"
import { getBasisName } from "./shared.js"

export type PredicateInner<rule extends Predicate = Predicate> =
	withAttributes<{
		readonly predicate: rule
	}>

export type PredicateSchema<rule extends Predicate = Predicate> =
	| rule
	| PredicateInner<rule>

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	schema: PredicateSchema
	inner: PredicateInner
	intersections: {
		predicate: "predicate" | null
	}
}>

export class PredicateNode extends BaseNode<PredicateDeclaration> {
	static readonly kind = "predicate"
	static readonly declaration: PredicateDeclaration

	static readonly definition = this.define({
		kind: "predicate",
		keys: {
			predicate: "in"
		},
		intersections: {
			predicate: () => null
		},
		parseSchema: (schema) =>
			typeof schema === "function" ? { predicate: schema } : schema,
		reduceToNode: (inner) => new PredicateNode(inner),
		compileCondition: (inner) =>
			`${compileSerializedValue(inner.predicate)}(${this.argName})`,
		writeDefaultDescription: (inner) =>
			`valid according to ${inner.predicate.name}`
	})

	static basis: IntersectionNode<unknown> = builtins().unknown

	static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return `Cannot narrow ${getBasisName(basis)}`
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
