import { implementNode } from "../../base.js"
import type { declareNode } from "../../shared/declare.js"
import type { RawConstraint } from "../constraint.js"
import {
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type RangeAttachments,
	deriveRangeAttachments,
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
	attachments: MinAttachments
}>

export interface MinAttachments extends RangeAttachments<MinDeclaration> {}

export const minImplementation = implementNode<MinDeclaration>({
	kind: "min",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {},
		exclusive: parseExclusiveKey
	},
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
	intersections: {
		min: (l, r) => (l.isStricterThan(r) ? l : r)
	},
	defaults: {
		description: (node) =>
			`${node.exclusive ? "more than" : "at least"} ${node.rule}`
	},
	construct: (self) =>
		deriveRangeAttachments<MinDeclaration>(self, {
			traverseAllows:
				self.exclusive ?
					(data) => data > self.rule
				:	(data) => data >= self.rule,
			impliedBasis: self.$.keywords.number
		})
})

export type MinNode = RawConstraint<MinDeclaration>
