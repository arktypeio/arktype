import { type RawNode, implementNode } from "../../base.js"
import { internalKeywords } from "../../keywords/internal.js"
import type { declareNode } from "../../shared/declare.js"
import type { RawConstraint } from "../constraint.js"
import {
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LengthBoundableData,
	type RangeAttachments,
	deriveRangeAttachments,
	parseExclusiveKey
} from "./range.js"

export interface MinLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMinLengthDef extends BaseNormalizedRangeSchema {
	rule: number
}

export type MinLengthDef = NormalizedMinLengthDef | number

export type MinLengthDeclaration = declareNode<{
	kind: "minLength"
	def: MinLengthDef
	normalizedDef: NormalizedMinLengthDef
	inner: MinLengthInner
	prerequisite: LengthBoundableData
	errorContext: MinLengthInner
	attachments: MinLengthAttachments
}>

export interface MinLengthAttachments
	extends RangeAttachments<MinLengthDeclaration> {}

export const minLengthImplementation = implementNode<MinLengthDeclaration>({
	kind: "minLength",
	collapsibleKey: "rule",
	hasAssociatedError: true,
	keys: {
		rule: {},
		exclusive: parseExclusiveKey
	},
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
	defaults: {
		description: (node) =>
			node.exclusive
				? node.rule === 0
					? "non-empty"
					: `more than length ${node.rule}`
				: node.rule === 1
					? "non-empty"
					: `at least length ${node.rule}`,
		actual: (data) => `${data.length}`
	},
	intersections: {
		minLength: (l, r) => (l.isStricterThan(r) ? l : r)
	},
	construct: (self) =>
		deriveRangeAttachments<MinLengthDeclaration>(self, {
			traverseAllows: self.exclusive
				? (data) => data.length > self.rule
				: (data) => data.length >= self.rule,
			impliedBasis: internalKeywords.lengthBoundable.raw
		})
})

export type MinLengthNode = RawConstraint<MinLengthDeclaration>
