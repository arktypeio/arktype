import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import { builtins } from "../builtins.ts"
import { In } from "../io/compile.ts"
import { type ConstraintAttachments } from "./constraint.ts"

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
	attach: ConstraintAttachments<number>
}>

export const DivisorImplementation = defineNode({
	kind: "divisor",
	keys: {
		divisor: "leaf"
	},
	intersections: {
		divisor: (l, r) => ({
			divisor: Math.abs(
				(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
			)
		})
	},
	parse: (schema) =>
		typeof schema === "number" ? { divisor: schema } : schema,
	writeDefaultDescription: (inner) =>
		inner.divisor === 1 ? "an integer" : `a multiple of ${inner.divisor}`,
	attach: (inner) => ({
		implicitBasis: builtins().number,
		condition: `${In} % ${inner.divisor} === 0`
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
