import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { implementNode } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	type BaseNormalizedRangeSchema,
	BaseRange,
	type BaseRangeInner,
	type LimitSchemaValue,
	type RangeAttachments,
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
		typeof def === "number" || typeof def === "string" || def instanceof Date ?
			{ rule: def }
		:	def,
	defaults: {
		description: (node) =>
			node.exclusive ?
				`before ${node.stringLimit}`
			:	`${node.stringLimit} or earlier`,
		actual: (data) => data.toLocaleString()
	},
	intersections: {
		before: (l, r) => (l.isStricterThan(r) ? l : r),
		after: (before, after, ctx) =>
			before.overlapsRange(after) ?
				before.overlapIsUnit(after) ?
					ctx.$.node("unit", { unit: before.rule })
				:	null
			:	Disjoint.from("range", before, after)
	}
})

export class BeforeNode extends BaseRange<BeforeDeclaration> {
	traverseAllows: TraverseAllows<Date> =
		this.exclusive ? (data) => data < this.rule : (data) => data <= this.rule

	impliedBasis = this.$.keywords.Date.raw
}
