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

export declare namespace Max {
	export interface Inner extends BaseRangeInner {
		rule: number
		exclusive?: true
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: number
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext extends BaseErrorContext<"max">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "max"
			inner: Inner
			prerequisite: number
			errorCtx: ErrorContext
		}> {}

	export type Node = MaxNode
}

const implementation: nodeImplementationOf<Max.Declaration> =
	implementNode<Max.Declaration>({
		kind: "max",
		bareKey: "rule",
		ownErr: true,
		keys: {
			rule: {},
			exclusive: {}
		},
		defaults: {
			description: node => {
				if (node.rule === 0) return node.exclusive ? "negative" : "non-positive"
				return `${node.exclusive ? "less than" : "at most"} ${node.rule}`
			}
		},
		coversNoun: true
	})

export class MaxNode extends BaseRange<Max.Declaration> {
	implied: BaseRoot = $ark.kw.number.internal

	traverseAllows: TraverseAllows<number> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule
}

export const Max = {
	impl: implementation,
	Node: MaxNode
}
