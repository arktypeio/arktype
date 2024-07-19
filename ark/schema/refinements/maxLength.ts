import { $ark } from "@ark/util"
import type { BaseRoot } from "../roots/root.js"
import type { declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseRangeInner,
	type LengthBoundableData,
	type UnknownNormalizedRangeSchema
} from "./range.js"

export interface MaxLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxLengthSchema
	extends UnknownNormalizedRangeSchema {
	rule: number
}

export type MaxLengthSchema = NormalizedMaxLengthSchema | number

export interface MaxLengthDeclaration
	extends declareNode<{
		kind: "maxLength"
		schema: MaxLengthSchema
		normalizedSchema: NormalizedMaxLengthSchema
		inner: MaxLengthInner
		prerequisite: LengthBoundableData
		errorContext: MaxLengthInner
	}> {}

export const maxLengthImplementation: nodeImplementationOf<MaxLengthDeclaration> =
	implementNode<MaxLengthDeclaration>({
		kind: "maxLength",
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
				node.exclusive ?
					`less than length ${node.rule}`
				:	`at most length ${node.rule}`,
			actual: data => `${data.length}`
		},
		intersections: {
			maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
			minLength: (max, min, ctx) =>
				max.overlapsRange(min) ?
					max.overlapIsUnit(min) ?
						ctx.$.node("exactLength", { rule: max.rule })
					:	null
				:	Disjoint.init("range", max, min)
		}
	})

export class MaxLengthNode extends BaseRange<MaxLengthDeclaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable

	traverseAllows: TraverseAllows<LengthBoundableData> =
		this.exclusive ?
			data => data.length < this.rule
		:	data => data.length <= this.rule
}
