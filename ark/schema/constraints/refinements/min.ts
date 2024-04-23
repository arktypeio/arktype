import type { declareNode } from "../../shared/declare.js"
import { implementNode } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	type BaseNormalizedRangeSchema,
	BaseRange,
	type BaseRangeInner,
	parseExclusiveKey
} from "./range.js"

export interface MinInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMinSchema extends BaseNormalizedRangeSchema {
	rule: number
}

export type MinSchema = NormalizedMinSchema | number

export type MinDeclaration = declareNode<{
	kind: "min"
	def: MinSchema
	normalizedDef: NormalizedMinSchema
	inner: MinInner
	prerequisite: number
	errorContext: MinInner
}>

export const minImplementation = implementNode<MinDeclaration>({
	kind: "min",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {},
		exclusive: parseExclusiveKey
	},
	normalize: def => (typeof def === "number" ? { rule: def } : def),
	intersections: {
		min: (l, r) => (l.isStricterThan(r) ? l : r)
	},
	defaults: {
		description: node =>
			`${node.exclusive ? "more than" : "at least"} ${node.rule}`
	}
})

export class MinNode extends BaseRange<MinDeclaration> {
	readonly impliedBasis = this.$.keywords.number.raw

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}
