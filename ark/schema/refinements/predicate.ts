import {
	In,
	compilePrimitive,
	compileSerializedValue,
	composePrimitiveTraversal,
	type Problems
} from "../shared/compilation.js"
import type { withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "./shared.js"

export type PredicateInner<predicate extends Predicate<any> = Predicate<any>> =
	withAttributes<{
		readonly predicate: predicate
	}>

export type PredicateSchema = PredicateInner | Predicate<any>

export type PredicateDeclaration = declareRefinement<{
	kind: "predicate"
	schema: PredicateSchema
	inner: PredicateInner
	intersections: {
		predicate: "predicate" | null
	}
	operand: unknown
	attach: PrimitiveConstraintAttachments<"predicate">
}>

// TODO: If node contains a predicate reference that doesn't take 1 arg, we need
// to wrap it with traversal state for allows
export const PredicateImplementation = defineRefinement({
	kind: "predicate",
	collapseKey: "predicate",
	keys: {
		predicate: {}
	},
	intersections: {
		// TODO: allow changed order to be the same type
		// as long as the narrows in l and r are individually safe to check
		// in the order they're specified, checking them in the order
		// resulting from this intersection should also be safe.
		predicate: () => null
	},
	operand: [{}],
	normalize: (schema) =>
		typeof schema === "function" ? { predicate: schema } : schema,
	writeDefaultDescription: (inner) =>
		`valid according to ${inner.predicate.name}`,
	attach: (node) => ({
		assertValidBasis: createValidBasisAssertion(node),
		traverse: composePrimitiveTraversal(node, node.predicate),
		condition: `${compileSerializedValue(node.predicate)}(${In})`,
		negatedCondition: `${compileSerializedValue(
			node.predicate
		)}(${In}) === false`
	}),
	compile: compilePrimitive
})

export type Predicate<input = unknown> = (
	input: input,
	problems: Problems
) => boolean

export type PredicateCast<input = never, narrowed extends input = input> = (
	input: input,
	problems: Problems
) => input is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
