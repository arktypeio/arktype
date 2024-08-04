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
	type UnknownNormalizedRangeSchema
} from "./range.js"

export namespace Max {
	export interface Inner extends BaseRangeInner {
		rule: number
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
		rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext extends BaseErrorContext<"max">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "max"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: number
			errorContext: ErrorContext
		}> {}

	export type Node = MaxNode
}

const implementation: nodeImplementationOf<Max.Declaration> =
	implementNode<Max.Declaration>({
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
				:	Disjoint.init("range", max, min)
		}
	})

export class MaxNode extends BaseRange<Max.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.number.internal

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule
}

export const Max = {
	implementation,
	Node: MaxNode
}
