import type { declareNode } from "../../shared/declare.js"
import { implementNode } from "../../shared/implement.js"
import type { RawConstraint } from "../constraint.js"
import {
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LimitSchemaValue,
	type RangeAttachments,
	deriveRangeAttachments,
	parseDateLimit,
	parseExclusiveKey
} from "./range.js"

export interface AfterInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedAfterDef extends BaseNormalizedRangeSchema {
	rule: LimitSchemaValue
}

export type AfterDef = NormalizedAfterDef | LimitSchemaValue

export type AfterDeclaration = declareNode<{
	kind: "after"
	def: AfterDef
	normalizedDef: NormalizedAfterDef
	inner: AfterInner
	prerequisite: Date
	errorContext: AfterInner
	attachments: AfterAttachments
}>

export interface AfterAttachments extends RangeAttachments<AfterDeclaration> {}

export const afterImplementation = implementNode<AfterDeclaration>({
	kind: "after",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {
			parse: parseDateLimit,
			serialize: (def) => def.toISOString()
		},
		exclusive: parseExclusiveKey
	},
	normalize: (def) =>
		typeof def === "number" || typeof def === "string" || def instanceof Date ?
			{ rule: def }
		:	def,
	defaults: {
		description: (node) =>
			node.exclusive ?
				`after ${node.stringLimit}`
			:	`${node.stringLimit} or later`,
		actual: (data) => data.toLocaleString()
	},
	intersections: {
		after: (l, r) => (l.isStricterThan(r) ? l : r)
	},
	construct: (self) =>
		deriveRangeAttachments<AfterDeclaration>({
			traverseAllows:
				self.exclusive ?
					(data) => data > self.rule
				:	(data) => data >= self.rule,
			impliedBasis: self.$.keywords.Date.raw
		})
})

export type AfterNode = RawConstraint<AfterDeclaration>
