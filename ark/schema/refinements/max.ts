import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseRangeInner,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace Max {
	export interface Inner extends BaseRangeInner {
		rule: number
		exclusive?: true
	}

	export interface NormalizedSchema extends UnknownExpandedRangeSchema {
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
		},
		obviatesBasisDescription: true
	})

export class MaxNode extends BaseRange<Max.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.number.internal

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule

	reduceJsonSchema(schema: JsonSchema.Numeric): JsonSchema.Numeric {
		if (this.exclusive) schema.exclusiveMaximum = this.rule
		else schema.maximum = this.rule
		return schema
	}
}

export const Max = {
	implementation,
	Node: MaxNode
}
