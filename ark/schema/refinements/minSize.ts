import { describeCollapsibleSize } from "@ark/util"
import type { IntersectionNode } from "../roots/intersection.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { ToJsonSchema } from "../shared/toJsonSchema.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import {
	BaseRange,
	createSizeRuleParser,
	parseExclusiveKey,
	type BaseRangeInner,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace MinSize {
	export interface Inner extends BaseRangeInner {
		rule: number
		exclusive?: true
	}

	export interface NormalizedSchema extends UnknownExpandedRangeSchema {
		rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext extends BaseErrorContext<"minSize">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "minSize"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: File
			reducibleTo: "intersection"
			errorContext: ErrorContext
		}> {}

	export type Node = MinSizeNode
}

const implementation: nodeImplementationOf<MinSize.Declaration> =
	implementNode<MinSize.Declaration>({
		kind: "minSize",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: { parse: createSizeRuleParser("minSize") },
			exclusive: parseExclusiveKey
		},
		reduce: inner =>
			// a non-exclusive minimum size of zero is trivially satisfied
			inner.rule === 0 && !inner.exclusive ?
				($ark.intrinsic.unknown as IntersectionNode)
			:	undefined,
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node => {
				if (node.rule === 0)
					return node.exclusive ? "positive size" : "non-negative size"
				const limit = describeCollapsibleSize(node.rule)
				return `${node.exclusive ? "more than" : "at least"} ${limit}`
			},
			actual: data => `${data.size} bytes`
		},
		intersections: {
			minSize: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class MinSizeNode extends BaseRange<MinSize.Declaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.File.internal

	readonly expression: string = `${this.comparator} ${describeCollapsibleSize(this.rule)}`

	traverseAllows: TraverseAllows<File> =
		this.exclusive ?
			data => data.size > this.rule
		:	data => data.size >= this.rule

	reduceJsonSchema(base: JsonSchema, ctx: ToJsonSchema.Context): JsonSchema {
		return ctx.fallback.size({ code: "size", base, minSize: this.rule })
	}
}

export const MinSize = {
	implementation,
	Node: MinSizeNode
}
