import { tsPrimitiveKeywords } from "../../builtins/tsKeywords.js"
import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type boundToIs
} from "./range.js"

export interface MinInner extends BaseRangeInner {
	min: number
}

export interface NormalizedMinSchema extends BaseNormalizedRangeSchema {
	min: number
}

export type MinSchema = NormalizedMinSchema | number

export type MinDeclaration = declareNode<{
	kind: "min"
	schema: MinSchema
	normalizedSchema: NormalizedMinSchema
	inner: MinInner
	prerequisite: number
	errorContext: MinInner
}>

export type min<n extends number> = boundToIs<"min", n>

export class MinNode extends BaseRange<MinDeclaration> {
	static implementation: nodeImplementationOf<MinDeclaration> = this.implement({
		collapsibleKey: "min",
		hasAssociatedError: true,
		keys: {
			min: {},
			exclusive: parseExclusiveKey
		},
		normalize: (schema) =>
			typeof schema === "number" ? { min: schema } : schema,
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		},
		defaults: {
			description(node) {
				return `${node.exclusive ? "more than" : "at least"} ${node.min}`
			}
		}
	})

	readonly impliedBasis = tsPrimitiveKeywords.number

	traverseAllows = this.exclusive
		? (data: number) => data > this.min
		: (data: number) => data >= this.min
}
