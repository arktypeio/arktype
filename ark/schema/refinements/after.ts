import type { declareNode } from "../shared/declare.js"
import { implementNode } from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import {
	type BaseNormalizedRangeRoot,
	BaseRange,
	type BaseRangeInner,
	type LimitRootValue,
	parseDateLimit,
	parseExclusiveKey
} from "./range.js"

export interface AfterInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedAfterSchema extends BaseNormalizedRangeRoot {
	rule: LimitRootValue
}

export type AfterSchema = NormalizedAfterSchema | LimitRootValue

export type AfterDeclaration = declareNode<{
	kind: "after"
	schema: AfterSchema
	normalizedSchema: NormalizedAfterSchema
	inner: AfterInner
	prerequisite: Date
	errorContext: AfterInner
}>

export const afterImplementation = implementNode<AfterDeclaration>({
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
	traverseAllows: TraverseAllows<Date> =
		this.exclusive ? data => data > this.rule : data => data >= this.rule

	impliedBasis = this.$.keywords.Date.raw
}
