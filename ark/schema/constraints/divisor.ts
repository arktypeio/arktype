import { In } from "../io/compile.ts"
import { builtins } from "../shared/builtins.ts"
import type { declareNode, withAttributes } from "../shared/declare.ts"
import { defineNode } from "../shared/define.ts"
import type { ConstraintAttachments } from "./constraint.ts"

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
		implicitBasis: builtins().number,
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
