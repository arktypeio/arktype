import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import { compileSerializedValue, In } from "../io/compile.ts"
import type { TraversalState } from "../io/traverse.ts"
import { type ConstraintAttachments } from "./constraint.ts"

export type PredicateInner<predicate extends Predicate = Predicate> =
	withAttributes<{
		readonly predicate: predicate
	}>

export type CollapsedPredicateSchema = Predicate

export type ExpandedPredicateSchema = PredicateInner

export type PredicateDeclaration = declareNode<{
	kind: "predicate"
	collapsedSchema: CollapsedPredicateSchema
	expandedSchema: ExpandedPredicateSchema
	inner: PredicateInner
	intersections: {
		predicate: "predicate" | null
	}
	attach: ConstraintAttachments<unknown>
}>

export const PredicateImplementation = defineNode({
	kind: "predicate",
	keys: {
		predicate: "leaf"
	},
	intersections: {
		predicate: () => null
	},
	parse: (schema) =>
		typeof schema === "function" ? { predicate: schema } : schema,
	writeDefaultDescription: (inner) =>
		`valid according to ${inner.predicate.name}`,
	attach: (inner) => ({
		implicitBasis: undefined,
		condition: `${compileSerializedValue(inner.predicate)}(${In})`
	})
})

// readonly implicitBasis = undefined

// static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
// 	return `Cannot narrow ${getBasisName(basis)}`
// }

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
