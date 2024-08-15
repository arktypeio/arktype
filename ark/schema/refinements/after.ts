import { describeCollapsibleDate } from "@ark/util"
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
	createDateSchemaNormalizer,
	parseDateLimit,
	type BaseRangeInner,
	type LimitSchemaValue,
	type UnknownExpandedRangeSchema,
	type UnknownNormalizedRangeSchema
} from "./range.js"

export declare namespace After {
	export interface Inner extends BaseRangeInner {
		rule: Date
	}

	export interface NormalizedSchema extends UnknownNormalizedRangeSchema {
		rule: LimitSchemaValue
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: LimitSchemaValue
	}

	export type Schema = ExpandedSchema | LimitSchemaValue

	export interface ErrorContext extends BaseErrorContext<"after">, Inner {}

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
			}
		},
		normalize: createDateSchemaNormalizer("after"),
		defaults: {
			description: node => `${node.collapsibleLimitString} or later`,
			actual: describeCollapsibleDate
		},
		intersections: {
			after: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})

export class AfterNode extends BaseRange<After.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.Date.internal

	collapsibleLimitString = describeCollapsibleDate(this.rule)

	traverseAllows: TraverseAllows<Date> = data => data >= this.rule
}

export const After = {
	implementation,
	Node: AfterNode
}
