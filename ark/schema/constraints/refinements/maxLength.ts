import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { implementNode } from "../../shared/implement.js"
import type { RawConstraint } from "../constraint.js"
import {
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LengthBoundableData,
	type RangeAttachments,
	deriveRangeAttachments,
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
		minLength: (max, min, $) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					$.node("exactLength", { rule: max.rule })
				:	null
			:	Disjoint.from("range", max, min)
	},
	construct: (self) =>
		deriveRangeAttachments<MaxLengthDeclaration>({
			traverseAllows:
				self.exclusive ?
					(data) => data.length < self.rule
				:	(data) => data.length <= self.rule,
			impliedBasis: self.$.keywords.lengthBoundable
		})
})

export type MaxLengthNode = RawConstraint<MaxLengthDeclaration>
