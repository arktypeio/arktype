import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { implementNode } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	type BaseNormalizedRangeSchema,
	BaseRange,
	type BaseRangeInner,
	type RangeAttachments,
	parseExclusiveKey
} from "./range.js"

export interface MaxInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxDef extends BaseNormalizedRangeSchema {
	rule: number
}

export type MaxDef = NormalizedMaxDef | number

export type MaxDeclaration = declareNode<{
	kind: "max"
	def: MaxDef
	normalizedDef: NormalizedMaxDef
	inner: MaxInner
	prerequisite: number
	errorContext: MaxInner
	attachments: MaxAttachments
}>

export interface MaxAttachments extends RangeAttachments<MaxDeclaration> {}

export const maxImplementation = implementNode<MaxDeclaration>({
	kind: "max",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {},
		exclusive: parseExclusiveKey
	},
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
	defaults: {
		description: (node) =>
			`${node.exclusive ? "less than" : "at most"} ${node.rule}`
	},
	intersections: {
		max: (l, r) => (l.isStricterThan(r) ? l : r),
		min: (max, min, ctx) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					ctx.$.node("unit", { unit: max.rule })
				:	null
			:	Disjoint.from("range", max, min)
	}
})

export class MaxNode extends BaseRange<MaxDeclaration> {
	impliedBasis = this.$.keywords.number.raw

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? (data) => data < this.rule : (data) => data <= this.rule
}
