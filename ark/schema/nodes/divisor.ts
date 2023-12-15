import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeImplementation } from "../shared/define.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { BasePrimitiveRefinement } from "./refinement.js"

export type DivisorInner = {
	readonly divisor: number
}

export type NormalizedDivisorSchema = withAttributes<DivisorInner>

export type DivisorSchema = NormalizedDivisorSchema | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	normalizedSchema: NormalizedDivisorSchema
	inner: DivisorInner
	intersections: {
		divisor: "divisor"
	}
	prerequisite: number
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export class DivisorNode extends BasePrimitiveRefinement<DivisorDeclaration> {
	static implementation: NodeImplementation<DivisorDeclaration> = {
		collapseKey: "divisor",
		keys: {
			divisor: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { divisor: schema } : schema,
		intersections: {
			divisor: (l, r) => ({
				divisor: Math.abs(
					(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
				)
			})
		},
		describeExpected(node) {
			return node.divisor === 1 ? "an integer" : `a multiple of ${node.divisor}`
		}
	}

	readonly hasOpenIntersection = false
	traverseAllows = (data: number) => data % this.divisor === 0

	condition = `${this.scope.argName} % ${this.divisor} === 0`
	negatedCondition = `${this.scope.argName} % ${this.divisor} !== 0`

	getCheckedDefinitions() {
		return ["number"] as const
	}
}

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
