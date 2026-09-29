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

export declare namespace Min {
	export interface Inner extends BaseRangeInner {
		rule: number
		exclusive?: true
	}

	export interface NormalizedSchema extends UnknownExpandedRangeSchema {
		rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext extends BaseErrorContext<"min">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "min"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: number
			errorContext: ErrorContext
		}> {}

	export type Node = MinNode
}

const implementation: nodeImplementationOf<Min.Declaration> =
	implementNode<Min.Declaration>({
		kind: "min",
		collapsibleKey: "rule",
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: defaultErrorWriters.min,
		obviatesBasisDescription: true
	})

export class MinNode extends BaseRange<Min.Declaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.number.internal

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}

export const Min = {
	implementation,
	Node: MinNode
}
