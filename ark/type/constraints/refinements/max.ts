import { tsPrimitiveKeywords } from "../../builtins/tsKeywords.js"
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
	max: number
}

export interface NormalizedMaxSchema extends BaseNormalizedRangeSchema {
	max: number
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
		collapsibleKey: "max",
		hasAssociatedError: true,
		keys: {
			max: {},
			exclusive: parseExclusiveKey
		},
		normalize: (schema) =>
			typeof schema === "number" ? { max: schema } : schema,
		defaults: {
			description(node) {
				return `${node.exclusive ? "less than" : "at most"} ${node.max}`
			}
		},
		intersections: {
			max: (l, r) => (l.isStricterThan(r) ? l : r),
			min: (max, min, $) =>
				max.overlapsRange(min)
					? max.overlapIsUnit(min)
						? $.parseSchema("unit", { unit: max.max })
						: null
					: Disjoint.from("range", max, min)
		}
	})

	readonly impliedBasis = tsPrimitiveKeywords.number

	traverseAllows = this.exclusive
		? (data: number) => data < this.max
		: (data: number) => data <= this.max
}
