import type { Schema } from "../../schema.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { implementNode } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	RawPrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.js"

export interface DivisorInner extends BaseMeta {
	readonly rule: number
}

export type DivisorDef = DivisorInner | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	def: DivisorDef
	normalizedDef: DivisorInner
	inner: DivisorInner
	prerequisite: number
	errorContext: DivisorInner
}>

export const divisorImplementation = implementNode<DivisorDeclaration>({
	kind: "divisor",
	collapsibleKey: "rule",
	keys: {
		rule: {}
	},
	normalize: def => (typeof def === "number" ? { rule: def } : def),
	intersections: {
		divisor: (l, r, ctx) =>
			ctx.$.node("divisor", {
				rule: Math.abs(
					(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
				)
			})
	},
	hasAssociatedError: true,
	defaults: {
		description: node =>
			node.rule === 1 ? "an integer" : `a multiple of ${node.rule}`
	}
})

export class DivisorNode extends RawPrimitiveConstraint<DivisorDeclaration> {
	traverseAllows: TraverseAllows<number> = data => data % this.rule === 0

	readonly compiledCondition = `data % ${this.rule} === 0`
	readonly compiledNegation = `data % ${this.rule} !== 0`
	readonly impliedBasis = this.$.keywords.number.raw
	readonly expression = `% ${this.rule}`
}

export const writeIndivisibleMessage = <node extends Schema>(
	t: node
): writeIndivisibleMessage<node> =>
	writeInvalidOperandMessage("divisor", t.$.raw.keywords.number, t)

export type writeIndivisibleMessage<node extends Schema> =
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
