import { tsKeywords } from "../../keywords/tsKeywords.js"
import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner
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
}>

export class MinNode extends BaseRange<MinDeclaration> {
	static implementation: nodeImplementationOf<MinDeclaration> = this.implement({
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
			description(node) {
				return `${node.exclusive ? "more than" : "at least"} ${node.rule}`
			}
		}
	})

	readonly impliedBasis = tsKeywords.number

	traverseAllows = this.exclusive
		? (data: number) => data > this.rule
		: (data: number) => data >= this.rule
}
