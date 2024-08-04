import { $ark } from "@ark/util"
import type { BaseRoot } from "../roots/root.js"
import type { BaseErrorContext, declareNode } from "../shared/declare.js"
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

export namespace MaxLength {
	export interface Inner extends BaseRangeInner {
		rule: number
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
		rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext extends BaseErrorContext<"maxLength">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "maxLength"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: LengthBoundableData
			errorContext: ErrorContext
		}> {}

	export type Node = MaxLengthNode
}

const implementation: nodeImplementationOf<MaxLength.Declaration> =
	implementNode<MaxLength.Declaration>({
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

export class MaxLengthNode extends BaseRange<MaxLength.Declaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal

	traverseAllows: TraverseAllows<LengthBoundableData> =
		this.exclusive ?
			data => data.length < this.rule
		:	data => data.length <= this.rule
}

export const MaxLength = {
	implementation,
	Node: MaxLengthNode
}
