import type { BaseRoot } from "../roots/root.js"
import type { BaseErrorContext, declareNode } from "../shared/declare.js"
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

export namespace Min {
	export interface Inner extends BaseRangeInner {
		rule: number
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
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
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node =>
				`${node.exclusive ? "more than" : "at least"} ${node.rule}`
		},
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		}
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
