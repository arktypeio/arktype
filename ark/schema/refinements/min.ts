import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import {
	BaseRange,
	type BaseRangeInner,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace Min {
	export interface Inner extends BaseRangeInner {
		rule: number
		exclusive?: true
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: number
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext extends BaseErrorContext<"min">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "min"
			inner: Inner
			prerequisite: number
			errorCtx: ErrorContext
		}> {}

	export type Node = MinNode
}

const implementation: nodeImplementationOf<Min.Declaration> =
	implementNode<Min.Declaration>({
		kind: "min",
		bareKey: "rule",
		ownErr: true,
		keys: {
			rule: {},
			exclusive: {}
		},
		defaults: {
			description: node => {
				if (node.rule === 0) return node.exclusive ? "positive" : "non-negative"
				return `${node.exclusive ? "more than" : "at least"} ${node.rule}`
			}
		},
		coversNoun: true
	})

export class MinNode extends BaseRange<Min.Declaration> {
	readonly implied: BaseRoot = $ark.intrinsic.number.internal

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}

export const Min = {
	impl: implementation,
	Node: MinNode
}
