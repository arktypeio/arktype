import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type boundToIs
} from "./range.js"

export type max<n extends number> = boundToIs<"max", n>

export interface MaxInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxSchema extends BaseNormalizedRangeSchema {
	rule: number
}

export type MaxSchema = NormalizedMaxSchema | number

export type MaxDeclaration = declareNode<{
	kind: "max"
	schema: MaxSchema
	normalizedSchema: NormalizedMaxSchema
	inner: MaxInner
	prerequisite: number
	errorContext: MaxInner
}>

export class MaxNode extends BaseRange<MaxDeclaration> {
	static implementation: nodeImplementationOf<MaxDeclaration> = this.implement({
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: (schema) =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description(node) {
				return `${node.exclusive ? "less than" : "at most"} ${node.rule}`
			}
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

	readonly impliedBasis = this.$.keywords.number

	traverseAllows = this.exclusive
		? (data: number) => data < this.rule
		: (data: number) => data <= this.rule
}
