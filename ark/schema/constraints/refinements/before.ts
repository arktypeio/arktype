import { implementNode } from "../../base.js"
import { jsObjects } from "../../keywords/jsObjects.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { BaseConstraint } from "../constraint.js"
import {
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LimitSchemaValue,
	type RangeAttachments,
	deriveRangeAttachments,
	parseDateLimit,
	parseExclusiveKey
} from "./range.js"

export interface BeforeInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedBeforeDef extends BaseNormalizedRangeSchema {
	rule: LimitSchemaValue
}

export type BeforeDef = NormalizedBeforeDef | LimitSchemaValue

export type BeforeDeclaration = declareNode<{
	kind: "before"
	def: BeforeDef
	normalizedDef: NormalizedBeforeDef
	inner: BeforeInner
	prerequisite: Date
	errorContext: BeforeInner
	attachments: BeforeAttachments
}>

export interface BeforeAttachments
	extends RangeAttachments<BeforeDeclaration> {}

export const beforeImplementation = implementNode<BeforeDeclaration>({
	kind: "before",
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
		typeof def === "number" ||
		typeof def === "string" ||
		def instanceof Date
			? { rule: def }
			: def,
	defaults: {
		description: (node) =>
			node.exclusive
				? `before ${node.stringLimit}`
				: `${node.stringLimit} or earlier`,
		actual: (data) => data.toLocaleString()
	},
	intersections: {
		before: (l, r) => (l.isStricterThan(r) ? l : r),
		after: (before, after, $) =>
			before.overlapsRange(after)
				? before.overlapIsUnit(after)
					? $.node("unit", { unit: before.rule })
					: null
				: Disjoint.from("range", before, after)
	},
	construct: (self) =>
		deriveRangeAttachments<BeforeDeclaration>(self, {
			traverseAllows: self.exclusive
				? (data) => data < self.rule
				: (data) => data <= self.rule,
			impliedBasis: jsObjects.Date.raw
		})
})

export type BeforeNode = BaseConstraint<BeforeDeclaration>
