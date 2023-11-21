import { compileSerializedValue, In } from "../io/compile.js"
import type { TraversalState } from "../io/traverse.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { RefinementAttachments } from "./refinement.js"
import { defineRefinement } from "./shared.js"

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
	attach: RefinementAttachments<unknown>
}>

export const PredicateImplementation = defineRefinement({
	kind: "predicate",
	keys: {
		predicate: {}
	},
	intersections: {
		predicate: () => null
	},
	normalize: (schema) =>
		typeof schema === "function" ? { predicate: schema } : schema,
	writeInvalidBasisMessage: writeUnnarrowableBasisMessage,
	writeDefaultDescription: (inner) =>
		`valid according to ${inner.predicate.name}`,
	attach: (inner) => ({
		implicitBasis: undefined,
		condition: `${compileSerializedValue(inner.predicate)}(${In})`
	})
})

export function writeUnnarrowableBasisMessage(basis: string) {
	return `Cannot narrow ${basis}`
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
