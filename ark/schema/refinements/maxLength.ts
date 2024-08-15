import type { BaseRoot } from "../roots/root.js"
import type { BaseErrorContext, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { $ark } from "../shared/registry.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	BaseRange,
	createLengthSchemaNormalizer,
	type BaseRangeInner,
	type LengthBoundableData,
	type UnknownExpandedRangeSchema,
	type UnknownNormalizedRangeSchema
} from "./range.js"

export namespace MaxLength {
	export interface Inner extends BaseRangeInner {
		rule: number
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
		rule: number
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: number
	}

	export type Schema = ExpandedSchema | number

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
			rule: {}
		},
		normalize: createLengthSchemaNormalizer("maxLength"),
		defaults: {
			description: node => `at most length ${node.rule}`,
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

	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length <= this.rule
}

export const MaxLength = {
	implementation,
	Node: MaxLengthNode
}
