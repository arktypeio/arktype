import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { TraverseAllows } from "../../shared/traversal.js"
import {
	BaseRange,
	parseDateLimit,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LimitSchemaValue
} from "./range.js"

export interface AfterInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedAfterSchema extends BaseNormalizedRangeSchema {
	rule: LimitSchemaValue
}

export type AfterSchema = NormalizedAfterSchema | LimitSchemaValue

export type AfterDeclaration = declareNode<{
	kind: "after"
	schema: AfterSchema
	normalizedSchema: NormalizedAfterSchema
	inner: AfterInner
	prerequisite: Date
	errorContext: AfterInner
}>

export class AfterNode extends BaseRange<AfterDeclaration> {
	static implementation: nodeImplementationOf<AfterDeclaration> =
		this.implement({
			collapsibleKey: "rule",
			hasAssociatedError: true,
			keys: {
				rule: {
					parse: parseDateLimit,
					serialize: (schema) => schema.toISOString()
				},
				exclusive: parseExclusiveKey
			},
			normalize: (schema) =>
				typeof schema === "number" ||
				typeof schema === "string" ||
				schema instanceof Date
					? { rule: schema }
					: schema,
			defaults: {
				description(node) {
					return node.exclusive
						? `after ${node.stringLimit}`
						: `${node.stringLimit} or later`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				after: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	readonly impliedBasis = this.$.keywords.Date

	traverseAllows: TraverseAllows<Date> = this.exclusive
		? (data) => +data > this.numericLimit
		: (data) => +data >= this.numericLimit
}
