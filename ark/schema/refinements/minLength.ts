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
		keys: {
			rule: {
				parse: createLengthRuleParser("minLength")
			}
		},
		normalize: createLengthSchemaNormalizer("minLength"),
		defaults: defaultErrorWriters.minLength
	})

export class MinLengthNode extends BaseRange<MinLength.Declaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal

	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length >= this.rule
}

export const MinLength = {
	implementation,
	Node: MinLengthNode
}
