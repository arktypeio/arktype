import { composeParser } from "../parse.js"
import type { declareNode, withAttributes } from "../shared/declare.js"

export type DivisorInner = {
	readonly divisor: number
}

export type NormalizedDivisorSchema = withAttributes<DivisorInner>

export type DivisorSchema = NormalizedDivisorSchema | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	inner: DivisorInner
	intersections: {
		divisor: "divisor"
	}
	checks: number
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export const DivisorImplementation = composeParser<DivisorDeclaration>({
	kind: "divisor",
	collapseKey: "divisor",
	keys: {
		divisor: {}
	},
	// operand: ["number"],
	normalize: (schema) =>
		typeof schema === "number" ? { divisor: schema } : schema
})

// attach: (node) => {
// 	const traverseAllows: TraverseAllows<number> = (data) =>
// 		data % node.divisor === 0
// 	return {
// 		traverseAllows,
// 		traverseApply: composePrimitiveTraversal(node, traverseAllows),
// 		assertValidBasis: composeOperandAssertion(node),
// 		condition: `${In} % ${node.divisor} === 0`,
// 		negatedCondition: `${In} % ${node.divisor} !== 0`
// 	}
// }

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
