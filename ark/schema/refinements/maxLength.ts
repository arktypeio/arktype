import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import {
	BaseRange,
	createLengthRuleParser,
	createLengthSchemaNormalizer,
	type BaseRangeInner,
	type LengthBoundableData,
	type UnknownExpandedRangeSchema,
	type UnknownNormalizedRangeSchema
} from "./range.ts"

export declare namespace MaxLength {
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
			reducibleTo: "exactLength"
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
			rule: {
				parse: createLengthRuleParser("maxLength")
			}
		},
		reduce: (inner, $) =>
			inner.rule === 0 ? $.node("exactLength", inner) : undefined,
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

	reduceJsonSchema(
		schema: JsonSchema.LengthBoundable
	): JsonSchema.LengthBoundable {
		switch (schema.type) {
			case "string":
				schema.maxLength = this.rule
				return schema
			case "array":
				schema.maxItems = this.rule
				return schema
			default:
				return JsonSchema.throwInternalOperandError("maxLength", schema)
		}
	}
}

export const MaxLength = {
	implementation,
	Node: MaxLengthNode
}
