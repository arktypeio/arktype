import type { BaseRoot } from "../roots/root.js"
import type { BaseErrorContext, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { $ark } from "../shared/registry.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	BaseRange,
	type BaseRangeInner,
	type LengthBoundableData,
	type UnknownNormalizedRangeSchema
} from "./range.js"

export namespace MinLength {
	export interface Inner extends BaseRangeInner {
		rule: number
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
		rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext extends BaseErrorContext<"minLength">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "minLength"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: LengthBoundableData
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
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node =>
				node.rule === 1 ? "non-empty" : `at least length ${node.rule}`,
			// avoid default message like "must be non-empty (was 0)"
			actual: data => (data.length === 0 ? null : `${data.length}`)
		},
		intersections: {
			minLength: (l, r) => (l.isStricterThan(r) ? l : r)
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
