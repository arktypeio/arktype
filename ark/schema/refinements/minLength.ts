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
	type LengthBoundableData,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace MinLength {
	export interface Inner extends BaseRangeInner {
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
			rule: {}
		},
		defaults: {
			description: node =>
				node.rule === 1 ? "non-empty" : `at least length ${node.rule}`,
			// avoid default message like "must be non-empty (was 0)"
			actual: data => (data.length === 0 ? "" : `${data.length}`)
		}
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
