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
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: defaultErrorWriters.max,
		obviatesBasisDescription: true
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
