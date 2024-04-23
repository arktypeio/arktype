import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { implementNode } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	type BaseNormalizedRangeSchema,
	BaseRange,
	type BaseRangeInner,
	type LengthBoundableData,
	type RangeAttachments,
	parseExclusiveKey
} from "./range.js"

export interface MaxLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxLengthDef extends BaseNormalizedRangeSchema {
	rule: number
}

export type MaxLengthDef = NormalizedMaxLengthDef | number

export type MaxLengthDeclaration = declareNode<{
	kind: "maxLength"
	def: MaxLengthDef
	normalizedDef: NormalizedMaxLengthDef
	inner: MaxLengthInner
	prerequisite: LengthBoundableData
	errorContext: MaxLengthInner
	attachments: MaxLengthAttachments
}>

export interface MaxLengthAttachments
	extends RangeAttachments<MaxLengthDeclaration> {}

export const maxLengthImplementation = implementNode<MaxLengthDeclaration>({
	kind: "maxLength",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {},
		exclusive: parseExclusiveKey
	},
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
	defaults: {
		description: (node) =>
			node.exclusive ?
				`less than length ${node.rule}`
			:	`at most length ${node.rule}`,
		actual: (data) => `${data.length}`
	},
	intersections: {
		maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
		minLength: (max, min, ctx) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					ctx.$.node("exactLength", { rule: max.rule })
				:	null
			:	Disjoint.from("range", max, min)
	}
})

export class MaxLengthNode extends BaseRange<MaxLengthDeclaration> {
	readonly impliedBasis = this.$.keywords.lengthBoundable.raw

	traverseAllows: TraverseAllows<LengthBoundableData> =
		this.exclusive ?
			(data) => data.length < this.rule
		:	(data) => data.length <= this.rule
}
