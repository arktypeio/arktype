import { implementNode } from "../../base.js"
import { jsObjects } from "../../keywords/jsObjects.js"
import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	BaseRange,
	parseDateLimit,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LimitSchemaValue
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
}>

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
		typeof def === "number" || typeof def === "string" || def instanceof Date
			? { rule: def }
			: def,
	defaults: {
		description: (node) =>
			node.exclusive
				? `after ${node.stringLimit}`
				: `${node.stringLimit} or later`,
		actual: (data) => data.toLocaleString()
	},
	intersections: {
		after: (l, r) => (l.isStricterThan(r) ? l : r)
	}
})

export class AfterNode extends BaseRange<AfterDeclaration> {
	static implementation: nodeImplementationOf<AfterDeclaration> =
		afterImplementation

	readonly impliedBasis = jsObjects.Date

	traverseAllows: TraverseAllows<Date> = this.exclusive
		? (data) => +data > this.numericLimit
		: (data) => +data >= this.numericLimit
}
