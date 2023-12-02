import { composeParser } from "../parse.js"
import {
	In,
	composePrimitiveTraversal,
	type TraverseAllows
} from "../shared/compilation.js"
import type { BaseAttributes, withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import {
	composeOperandAssertion,
	composeRefinement,
	type declareRefinement
} from "./shared.js"

export type DivisorInner = {
	readonly divisor: number
}

export type NormalizedDivisorSchema = withAttributes<DivisorInner>

export type DivisorSchema = NormalizedDivisorSchema | number

export type DivisorDeclaration = declareRefinement<{
	kind: "divisor"
	schema: DivisorSchema
	normalizedSchema: NormalizedDivisorSchema
	inner: DivisorInner
	meta: BaseAttributes
	intersections: {
		divisor: "divisor"
	}
	operand: number
	attach: PrimitiveConstraintAttachments
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export const DivisorImplementation = composeRefinement<DivisorDeclaration>({
	kind: "divisor",
	collapseKey: "divisor",
	keys: {
		divisor: {}
	},
	operand: ["number"],
	normalize: (schema) =>
		typeof schema === "number" ? { divisor: schema } : schema,
	attach: (node) => {
		const traverseAllows: TraverseAllows<number> = (data) =>
			data % node.divisor === 0
		return {
			traverseAllows,
			traverseApply: composePrimitiveTraversal(node, traverseAllows),
			assertValidBasis: composeOperandAssertion(node),
			condition: `${In} % ${node.divisor} === 0`,
			negatedCondition: `${In} % ${node.divisor} !== 0`
		}
	}
})

// intersections: {
// 	divisor: (l, r) => ({
// 		divisor: Math.abs(
// 			(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
// 		)
// 	})
// },
// compile: compilePrimitive,
// writeDefaultDescription: (inner) =>
// 	inner.divisor === 1 ? "an integer" : `a multiple of ${inner.divisor}`,

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
	let previous: number
	let greatestCommonDivisor = l
	let current = r
	while (current !== 0) {
		previous = current
		current = greatestCommonDivisor % current
		greatestCommonDivisor = previous
	}
	return greatestCommonDivisor
}
