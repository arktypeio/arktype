import { type BaseNode, implementNode } from "../../base.js"
import { internalKeywords } from "../../keywords/internal.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { BaseConstraint } from "../constraint.js"
import {
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type RangeAttachments,
	deriveRangeAttachments,
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
		min: (max, min, $) =>
			max.overlapsRange(min)
				? max.overlapIsUnit(min)
					? $.node("unit", { unit: max.rule })
					: null
				: Disjoint.from("range", max, min)
	},
	construct: (self) =>
		deriveRangeAttachments<MaxDeclaration>(self, {
			traverseAllows: self.exclusive
				? (data) => data < self.rule
				: (data) => data <= self.rule,
			impliedBasis: internalKeywords.lengthBoundable
		})
})

export type MaxNode = BaseConstraint<MaxDeclaration>
