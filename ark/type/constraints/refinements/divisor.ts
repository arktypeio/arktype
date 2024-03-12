import { compose } from "@arktype/util"
import { BaseNode, type TypeNode } from "../../base.js"
import { jsData } from "../../shared/compile.js"
import type { declareNode } from "../../shared/declare.js"
import {
	derivePrimitiveAttachments,
	implement,
	type PrimitiveAttachments
} from "../../shared/implement.js"
import {
	writeInvalidOperandMessage,
	type PrimitiveConstraintInner
} from "../constraint.js"

export interface DivisorInner extends PrimitiveConstraintInner<number> {}

export type divisor<n extends number> = { "%": n }

export type DivisorSchema = DivisorInner | number

export interface DivisorAttachments
	extends PrimitiveAttachments<DivisorDeclaration> {}

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	normalizedSchema: DivisorInner
	inner: DivisorInner
	prerequisite: number
	errorContext: DivisorInner
	attachments: DivisorAttachments
}>

export interface DivisorNode extends BaseNode<DivisorDeclaration> {}

export const divisorImplementation = implement<DivisorDeclaration>({
	collapseKey: "rule",
	keys: {
		rule: {}
	},
	normalize: (schema) =>
		typeof schema === "number" ? { rule: schema } : schema,
	intersections: {
		divisor: (l, r, $) =>
			$.parseSchema("divisor", {
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
	},
	attach: derivePrimitiveAttachments((base) => {
		const description =
			base.rule === 1 ? "an integer" : `a multiple of ${base.rule}`
		return {
			description,
			traverseAllows: (data: number) => data % base.rule === 0,
			compiledCondition: `${jsData} % ${base.rule} === 0`,
			compiledNegation: `${jsData} % ${base.rule} !== 0`,
			impliedBasis: base.$.tsKeywords.number,
			expression: `% ${base.rule}`,
			errorContext: {
				code: "divisor",
				description,
				...base.inner
			}
		}
	})
})

// export class Divisor extends compose(BaseNode, )

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
