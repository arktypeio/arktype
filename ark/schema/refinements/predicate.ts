import { TsKeywords } from "../builtins/tsKeywords.js"
import {
	In,
	compilePrimitive,
	compileSerializedValue
} from "../shared/compilation.js"
import type { withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "./shared.js"

export type PredicateInner<predicate extends Predicate = Predicate> =
	withAttributes<{
		readonly predicate: predicate
	}>

export type PredicateDefinition = PredicateInner | Predicate

export type PredicateDeclaration = declareRefinement<{
	kind: "predicate"
	definition: PredicateDefinition
	inner: PredicateInner
	intersections: {
		predicate: "predicate" | null
	}
	operand: unknown
	attach: PrimitiveConstraintAttachments
}>

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
	operand: TsKeywords.resolutions.unknown,
	normalize: (schema) =>
		typeof schema === "function" ? { predicate: schema } : schema,
	writeDefaultDescription: (inner) =>
		`valid according to ${inner.predicate.name}`,
	attach: (node) => ({
		assertValidBasis: createValidBasisAssertion(node),
		condition: `${compileSerializedValue(node.predicate)}(${In})`,
		negatedCondition: `${compileSerializedValue(
			node.predicate
		)}(${In}) === false`
	}),
	compile: compilePrimitive
})

export type Predicate<data = any> = (data: data, traversal: any) => boolean

export type PredicateCast<data = any, narrowed extends data = data> = (
	data: data
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
