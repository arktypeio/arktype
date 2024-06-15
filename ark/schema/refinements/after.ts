import type { BaseRoot } from "../roots/root.js"
import type { declareNode } from "../shared/declare.js"
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

export interface AfterInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedAfterSchema extends UnknownNormalizedRangeSchema {
	rule: LimitSchemaValue
}

export type AfterSchema = NormalizedAfterSchema | LimitSchemaValue

export interface AfterDeclaration
	extends declareNode<{
		kind: "after"
		schema: AfterSchema
		normalizedSchema: NormalizedAfterSchema
		inner: AfterInner
		prerequisite: Date
		errorContext: AfterInner
	}> {}

export const afterImplementation: nodeImplementationOf<AfterDeclaration> =
	implementNode<AfterDeclaration>({
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

export class AfterNode extends BaseRange<AfterDeclaration> {
	impliedBasis: BaseRoot = this.$.keywords.Date.internal

	traverseAllows: TraverseAllows<Date> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule
}
