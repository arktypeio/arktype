import type { IntersectionNode } from "../roots/intersection.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { ToJsonSchema } from "../shared/unjsonifiable.ts"
import {
	BaseRange,
	createLengthRuleParser,
	createLengthSchemaNormalizer,
	type BaseRangeInner,
	type LengthBoundableData,
	type UnknownExpandedRangeSchema,
	type UnknownNormalizedRangeSchema
} from "./range.ts"

export declare namespace MinLength {
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

	export interface ErrorContext extends BaseErrorContext<"minLength">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "minLength"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: LengthBoundableData
			reducibleTo: "intersection"
			errorContext: ErrorContext
		}> {}

	export type Node = MinLengthNode
}

const implementation: nodeImplementationOf<MinLength.Declaration> =
	implementNode<MinLength.Declaration>({
		kind: "minLength",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: createLengthRuleParser("minLength")
			}
		},
		reduce: inner =>
			inner.rule === 0 ?
				// a minimum length of zero is trivially satisfied
				($ark.intrinsic.unknown as IntersectionNode)
			:	undefined,
		normalize: createLengthSchemaNormalizer("minLength"),
		defaults: {
			description: node =>
				node.rule === 1 ? "non-empty" : `at least length ${node.rule}`,
			// avoid default message like "must be non-empty (was 0)"
			actual: data => (data.length === 0 ? "" : `${data.length}`)
		},
		intersections: {
			minLength: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class MinLengthNode extends BaseRange<MinLength.Declaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal

	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length >= this.rule

	reduceJsonSchema(
		schema: JsonSchema.LengthBoundable
	): JsonSchema.LengthBoundable {
		switch (schema.type) {
			case "string":
				schema.minLength = this.rule
				return schema
			case "array":
				schema.minItems = this.rule
				return schema
			default:
				return ToJsonSchema.throwInternalOperandError("minLength", schema)
		}
	}
}

export const MinLength = {
	implementation,
	Node: MinLengthNode
}
