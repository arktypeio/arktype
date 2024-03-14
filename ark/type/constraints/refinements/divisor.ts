import { tsPrimitiveKeywords } from "../../builtins/tsKeywords.js"
import { jsData } from "../../shared/compile.js"
import type { TraverseAllows } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type { Type } from "../../types/type.js"
import {
	BasePrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.js"

export interface DivisorInner extends BaseMeta {
	readonly divisor: number
}

export type divisor<n extends number> = { "%": n }

export type DivisorSchema = DivisorInner | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	normalizedSchema: DivisorInner
	inner: DivisorInner
	prerequisite: number
	errorContext: DivisorInner
}>

export class DivisorNode extends BasePrimitiveConstraint<DivisorDeclaration> {
	static implementation = this.implement({
		collapsibleKey: "divisor",
		keys: {
			divisor: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { divisor: schema } : schema,
		intersections: {
			divisor: (l, r, $) =>
				$.parseSchema("divisor", {
					divisor: Math.abs(
						(l.divisor * r.divisor) /
							greatestCommonDivisor(l.divisor, r.divisor)
					)
				})
		},
		hasAssociatedError: true,
		defaults: {
			description(node) {
				return node.divisor === 1
					? "an integer"
					: `a multiple of ${node.divisor}`
			}
		}
	})

	traverseAllows: TraverseAllows<number> = (data) => data % this.divisor === 0

	readonly compiledCondition = `${jsData} % ${this.divisor} === 0`
	readonly compiledNegation = `${jsData} % ${this.divisor} !== 0`
	readonly impliedBasis = tsPrimitiveKeywords.number
	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = `% ${this.divisor}`
}

export const writeIndivisibleMessage = <node extends Type>(
	t: node
): writeIndivisibleMessage<node> =>
	writeInvalidOperandMessage("divisor", tsPrimitiveKeywords.number, t)

export type writeIndivisibleMessage<node extends Type> =
	writeInvalidOperandMessage<"divisor", node>

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
