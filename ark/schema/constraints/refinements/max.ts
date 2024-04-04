import { implementNode } from "../../base.js"
import { tsKeywords } from "../../keywords/tsKeywords.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner
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
}>

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
	}
})

export class MaxNode extends BaseRange<MaxDeclaration> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		maxImplementation

	readonly impliedBasis = tsKeywords.number

	traverseAllows = this.exclusive
		? (data: number) => data < this.rule
		: (data: number) => data <= this.rule
}
