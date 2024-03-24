import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import type { Type } from "../../types/type.js"
import {
	BasePrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.js"

export interface DivisorInner extends BaseMeta {
	readonly rule: number
}

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
		collapsibleKey: "rule",
		keys: {
			rule: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { rule: schema } : schema,
		intersections: {
			divisor: (l, r, $) =>
				$.node("divisor", {
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

	traverseAllows: TraverseAllows<number> = (data) => data % this.rule === 0

	readonly compiledCondition = `data % ${this.rule} === 0`
	readonly compiledNegation = `data % ${this.rule} !== 0`
	readonly impliedBasis = this.$.keywords.number
	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = `% ${this.rule}`
}

export const writeIndivisibleMessage = <node extends Type>(
	t: node
): writeIndivisibleMessage<node> =>
	writeInvalidOperandMessage("divisor", t.$.keywords.number, t)

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
