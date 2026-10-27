import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	BaseRange,
	type BaseRangeInner,
	type LengthBoundableData,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace MaxLength {
	export interface Inner extends BaseRangeInner {
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
			reducibleTo: "exactLength"
			inner: Inner
			prerequisite: LengthBoundableData
			errorCtx: ErrorContext
		}> {}

	export type Node = MaxLengthNode
}

const implementation: nodeImplementationOf<MaxLength.Declaration> =
	implementNode<MaxLength.Declaration>({
		kind: "maxLength",
		bareKey: "rule",
		ownErr: true,
		keys: {
			rule: {}
		},
		defaults: {
			description: node => `at most length ${node.rule}`
		}
	})

export class MaxLengthNode extends BaseRange<MaxLength.Declaration> {
	readonly implied: BaseRoot = $ark.intrinsic.lengthBoundable.internal

	traverseAllows(data: LengthBoundableData): boolean {
		return data.length <= this.rule
	}
}

export const MaxLength = {
	implementation,
	Node: MaxLengthNode
}
