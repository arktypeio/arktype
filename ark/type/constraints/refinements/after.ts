import { jsObjectKeywords } from "../../builtins/jsObjects.js"
import type { TraverseAllows } from "../../shared/context.js"
import type { declareNode } from "../../shared/declare.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseDateLimit,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LimitSchemaValue,
	type boundToIs
} from "./range.js"

export type after<date extends string> = boundToIs<"after", date>

export interface AfterInner extends BaseRangeInner {
	after: Date
}

export interface NormalizedAfterSchema extends BaseNormalizedRangeSchema {
	after: LimitSchemaValue
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
			collapsibleKey: "after",
			hasAssociatedError: true,
			keys: {
				after: parseDateLimit,
				exclusive: parseExclusiveKey
			},
			normalize: (schema) =>
				typeof schema === "number" ||
				typeof schema === "string" ||
				schema instanceof Date
					? { after: schema }
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

	readonly impliedBasis = jsObjectKeywords.Date

	traverseAllows: TraverseAllows<Date> = this.exclusive
		? (data) => +data > this.numericLimit
		: (data) => +data >= this.numericLimit
}
