import {
	RawPrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.js"
import type { BaseRoot, RawRootDeclaration, Root } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"

export interface DivisorInner extends BaseMeta {
	readonly rule: number
}

export type DivisorSchema = DivisorInner | number

export interface DivisorDeclaration
	extends declareNode<{
		kind: "divisor"
		schema: DivisorSchema
		normalizedSchema: DivisorInner
		inner: DivisorInner
		prerequisite: number
		errorContext: DivisorInner
	}> {}

export const divisorImplementation: nodeImplementationOf<DivisorDeclaration> =
	implementNode<DivisorDeclaration>({
		kind: "divisor",
		collapsibleKey: "rule",
		keys: {
			rule: {}
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description: node =>
				node.rule === 1 ? "an integer" : `a multiple of ${node.rule}`
		},
		intersections: {
			divisor: (l, r, ctx) =>
				ctx.$.node("divisor", {
					rule: Math.abs(
						(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
					)
				})
		}
	})

export class DivisorNode extends RawPrimitiveConstraint<DivisorDeclaration> {
	traverseAllows: TraverseAllows<number> = data => data % this.rule === 0

	readonly compiledCondition: string = `data % ${this.rule} === 0`
	readonly compiledNegation: string = `data % ${this.rule} !== 0`
	readonly impliedBasis: BaseRoot<RawRootDeclaration> =
		this.$.keywords.number.raw
	readonly expression: string = `% ${this.rule}`
}

export const writeIndivisibleMessage = <node extends Root>(
	t: node
): writeIndivisibleMessage<node> =>
	writeInvalidOperandMessage("divisor", t.$.raw.keywords.number, t)

export type writeIndivisibleMessage<node extends Root> =
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
