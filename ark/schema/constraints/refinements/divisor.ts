import type { TypeNode } from "../../base.js"
import { jsData } from "../../shared/compile.js"
import type { declareNode } from "../../shared/declare.js"
import {
	BasePrimitiveConstraint,
	writeInvalidOperandMessage,
	type PrimitiveConstraintInner
} from "../constraint.js"

export interface DivisorInner extends PrimitiveConstraintInner<number> {}

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

export class DivisorNode extends BasePrimitiveConstraint<
	DivisorDeclaration,
	typeof DivisorNode
> {
	static implementation = this.implement({
		collapseKey: "rule",
		keys: {
			rule: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { rule: schema } : schema,
		intersections: {
			divisor: (l, r, $) =>
				$.parse("divisor", {
					rule: Math.abs(
						(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
					)
				})
		},
		hasAssociatedError: true,
		defaults: {
			description(node) {
				return node.rule === 1 ? "an integer" : `a multiple of ${node.rule}`
			}
		}
	})

	traverseAllows = (data: number) => data % this.rule === 0

	readonly compiledCondition = `${jsData} % ${this.rule} === 0`
	readonly compiledNegation = `${jsData} % ${this.rule} !== 0`
	readonly impliedBasis = this.$.tsKeywords.number
	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = `% ${this.rule}`
}

export const writeIndivisibleMessage = <node extends TypeNode>(t: node) =>
	writeInvalidOperandMessage(
		"divisor",
		t.$.tsKeywords.number,
		t
	) as writeIndivisibleMessage<node>

export type writeIndivisibleMessage<node extends TypeNode> =
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
