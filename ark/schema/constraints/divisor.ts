import { In } from "../io/compile.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defineNode } from "../shared/define.js"
import type { ConstraintAttachments } from "./constraint.js"

export type DivisorInner = withAttributes<{
	readonly divisor: number
}>

export type ExpandedDivisorSchema = DivisorInner

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	collapsedSchema: number
	expandedSchema: ExpandedDivisorSchema
	inner: DivisorInner
	intersections: {
		divisor: "divisor"
	}
	attach: ConstraintAttachments<number>
}>

export const DivisorImplementation = defineNode({
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
	writeDefaultDescription: (inner) =>
		inner.divisor === 1 ? "an integer" : `a multiple of ${inner.divisor}`,
	attach: (node) => ({
		implicitBasis: node.cls.builtins.number,
		condition: `${In} % ${node.divisor} === 0`
	})
})

// readonly implicitBasis: DomainNode<number> = builtins().number

// static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
// 	return writeIndivisibleMessage(getBasisName(basis))
// }

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

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`
