import { composeParser } from "../parse.js"
import { In, composePrimitiveTraversal } from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { RefinementNode } from "./shared.js"

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
	normalize: (schema) =>
		typeof schema === "number" ? { divisor: schema } : schema
})

export class DivisorNode extends RefinementNode<DivisorDeclaration> {
	traverseAllows = (data: number) => data % this.divisor === 0
	traverseApply = composePrimitiveTraversal(this, this.traverseAllows)
	condition = `${In} % ${this.divisor} === 0`
	negatedCondition = `${In} % ${this.divisor} !== 0`

	getCheckedDefinitions() {
		return ["number"] as const
	}

	writeDefaultDescription() {
		return this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`
	}
}

// intersections: {
// 	divisor: (l, r) => ({
// 		divisor: Math.abs(
// 			(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
// 		)
// 	})
// },
// compile: compilePrimitive,

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
