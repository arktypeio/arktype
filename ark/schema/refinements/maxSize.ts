import { describeCollapsibleSize } from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
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

export declare namespace MaxSize {
	export interface Inner extends BaseRangeInner {
		rule: number
		exclusive?: true
	}

	export interface NormalizedSchema extends UnknownExpandedRangeSchema {
		rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext extends BaseErrorContext<"maxSize">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "maxSize"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: File
			errorContext: ErrorContext
		}> {}

	export type Node = MaxSizeNode
}

const implementation: nodeImplementationOf<MaxSize.Declaration> =
	implementNode<MaxSize.Declaration>({
		kind: "maxSize",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: { parse: createSizeRuleParser("maxSize") },
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		defaults: {
			description: node => {
				if (node.rule === 0)
					return node.exclusive ? "negative size" : "non-positive size"
				const limit = describeCollapsibleSize(node.rule)
				return `${node.exclusive ? "less than" : "at most"} ${limit}`
			},
			actual: data => `${data.size} bytes`
		},
		intersections: {
			maxSize: (l, r) => (l.isStricterThan(r) ? l : r),
			minSize: (max, min) =>
				max.overlapsRange(min) ? null : Disjoint.init("range", max, min)
		}
	})

export class MaxSizeNode extends BaseRange<MaxSize.Declaration> {
	readonly impliedBasis: BaseRoot = $ark.intrinsic.File.internal

	readonly expression: string = `${this.comparator} ${describeCollapsibleSize(this.rule)}`

	traverseAllows: TraverseAllows<File> =
		this.exclusive ?
			data => data.size < this.rule
		:	data => data.size <= this.rule

	reduceJsonSchema(base: JsonSchema, ctx: ToJsonSchema.Context): JsonSchema {
		return ctx.fallback.size({ code: "size", base, maxSize: this.rule })
	}
}

export const MaxSize = {
	implementation,
	Node: MaxSizeNode
}
