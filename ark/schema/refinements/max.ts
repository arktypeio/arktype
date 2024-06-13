import type { BaseRoot } from "../roots/root.js"
import type { declareNode } from "../shared/declare.js"
import { Disjoints } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseRangeInner,
	type UnknownNormalizedRangeSchema
} from "./range.js"

export interface MaxInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxSchema extends UnknownNormalizedRangeSchema {
	rule: number
}

export type MaxSchema = NormalizedMaxSchema | number

export interface MaxDeclaration
	extends declareNode<{
		kind: "max"
		schema: MaxSchema
		normalizedSchema: NormalizedMaxSchema
		inner: MaxInner
		prerequisite: number
		errorContext: MaxInner
	}> {}

export const maxImplementation: nodeImplementationOf<MaxDeclaration> =
	implementNode<MaxDeclaration>({
		kind: "max",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node =>
				`${node.exclusive ? "less than" : "at most"} ${node.rule}`
		},
		intersections: {
			max: (l, r) => (l.isStricterThan(r) ? l : r),
			min: (max, min, ctx) =>
				max.overlapsRange(min) ?
					max.overlapIsUnit(min) ?
						ctx.$.node("unit", { unit: max.rule })
					:	null
				:	Disjoints.from("range", max, min)
		}
	})

export class MaxNode extends BaseRange<MaxDeclaration> {
	impliedBasis: BaseRoot = this.$.keywords.number.raw

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule
}
