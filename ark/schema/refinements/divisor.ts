import { In } from "../io/compile.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { RefinementAttachments } from "./refinement.js"
import { defineRefinement } from "./shared.js"

export type DivisorInner = withAttributes<{
	readonly divisor: number
}>

export type DivisorSchema = DivisorInner | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	inner: DivisorInner
	intersections: {
		divisor: "divisor"
	}
	attach: RefinementAttachments<number>
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export const DivisorImplementation = defineRefinement({
	kind: "divisor",
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
	normalize: (schema) =>
		typeof schema === "number" ? { divisor: schema } : schema,
	writeInvalidBasisMessage: writeIndivisibleMessage,
	writeDefaultDescription: (inner) =>
		inner.divisor === 1 ? "an integer" : `a multiple of ${inner.divisor}`,
	attach: (node) => ({
		implicitBasis: node.cls.builtins.number,
		condition: `${In} % ${node.divisor} === 0`
	})
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
