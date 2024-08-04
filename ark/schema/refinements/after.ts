import { $ark } from "@ark/util"
import type { BaseRoot } from "../roots/root.js"
import type { BaseErrorContext, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	BaseRange,
	parseDateLimit,
	parseExclusiveKey,
	type BaseRangeInner,
	type LimitSchemaValue,
	type UnknownNormalizedRangeSchema
} from "./range.js"

export namespace After {
	export interface Inner extends BaseRangeInner {
		rule: Date
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
		rule: LimitSchemaValue
	}

	export interface ErrorContext extends BaseErrorContext<"after">, Inner {}

	export type Schema = NormalizedSchema | LimitSchemaValue

	export interface Declaration
		extends declareNode<{
			kind: "after"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: Date
			errorContext: ErrorContext
		}> {}

	export type Node = AfterNode
}

const implementation: nodeImplementationOf<After.Declaration> =
	implementNode<After.Declaration>({
		kind: "after",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: parseDateLimit,
				serialize: schema => schema.toISOString()
			},
			exclusive: parseExclusiveKey
		},
		normalize: schema =>
			(
				typeof schema === "number" ||
				typeof schema === "string" ||
				schema instanceof Date
			) ?
				{ rule: schema }
			:	schema,
		defaults: {
			description: node =>
				node.exclusive ?
					`after ${node.stringLimit}`
				:	`${node.stringLimit} or later`,
			actual: data => data.toLocaleString()
		},
		intersections: {
			after: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class AfterNode extends BaseRange<After.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.Date.internal

	traverseAllows: TraverseAllows<Date> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}

export const After = {
	implementation,
	Node: AfterNode
}
