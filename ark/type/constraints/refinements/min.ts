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
	rule: number
}

export interface NormalizedMinSchema extends BaseNormalizedRangeSchema {
	rule: number
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
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: (schema) =>
			typeof schema === "number" ? { rule: schema } : schema,
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		},
		defaults: {
			description(node) {
				return `${node.exclusive ? "more than" : "at least"} ${node.rule}`
			}
		}
	})

	readonly impliedBasis = this.$.keywords.number

	traverseAllows = this.exclusive
		? (data: number) => data > this.rule
		: (data: number) => data >= this.rule
}
