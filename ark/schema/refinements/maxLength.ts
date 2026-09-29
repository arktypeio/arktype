import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import { defaultErrorWriters } from "../shared/errorWriters.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
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
		keys: {
			rule: {
				parse: createLengthRuleParser("maxLength")
			}
		},
		normalize: createLengthSchemaNormalizer("maxLength"),
		defaults: defaultErrorWriters.maxLength
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
