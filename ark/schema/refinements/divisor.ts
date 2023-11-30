import {
	In,
	compilePrimitive,
	composePrimitiveTraversal
} from "../shared/compilation.js"
import type { withAttributes } from "../shared/declare.js"
import type { PrimitiveConstraintAttachments } from "../shared/define.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type declareRefinement
} from "./shared.js"

export type DivisorInner = withAttributes<{
	readonly divisor: number
}>

export type DivisorSchema = DivisorInner | number

export type DivisorDeclaration = declareRefinement<{
	kind: "divisor"
	schema: DivisorSchema
	inner: DivisorInner
	intersections: {
		divisor: "divisor"
	}
	operand: number
	attach: PrimitiveConstraintAttachments<"divisor">
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export const DivisorImplementation = defineRefinement({
	kind: "divisor",
	collapseKey: "divisor",
	keys: {
		divisor: {}
	},
	intersections: {
		divisor: (l, r) => ({
			divisor: Math.abs(
				(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
			)
		})
	},
	operand: ["number"],
	normalize: (schema) =>
		typeof schema === "number" ? { divisor: schema } : schema,
	writeDefaultDescription: (inner) =>
		inner.divisor === 1 ? "an integer" : `a multiple of ${inner.divisor}`,
	attach: (node) => ({
		traverse: composePrimitiveTraversal(
			node,
			(data) => data % node.divisor === 0
		),
		assertValidBasis: createValidBasisAssertion(node),
		condition: `${In} % ${node.divisor} === 0`,
		negatedCondition: `${In} % ${node.divisor} !== 0`
	}),
	compile: compilePrimitive
})

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
