import { $ark } from "@ark/util"
import type { BaseRoot } from "../roots/root.js"
import type { declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
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

export interface BeforeInner extends BaseRangeInner {
	rule: Date
}

export interface NormalizedBeforeSchema extends UnknownNormalizedRangeSchema {
	rule: LimitSchemaValue
}

export type BeforeSchema = NormalizedBeforeSchema | LimitSchemaValue

export interface BeforeDeclaration
	extends declareNode<{
		kind: "before"
		schema: BeforeSchema
		normalizedSchema: NormalizedBeforeSchema
		inner: BeforeInner
		prerequisite: Date
		errorContext: BeforeInner
	}> {}

export const beforeImplementation: nodeImplementationOf<BeforeDeclaration> =
	implementNode<BeforeDeclaration>({
		kind: "before",
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
					`before ${node.stringLimit}`
				:	`${node.stringLimit} or earlier`,
			actual: data => data.toLocaleString()
		},
		intersections: {
			before: (l, r) => (l.isStricterThan(r) ? l : r),
			after: (before, after, ctx) =>
				before.overlapsRange(after) ?
					before.overlapIsUnit(after) ?
						ctx.$.node("unit", { unit: before.rule })
					:	null
				:	Disjoint.init("range", before, after)
		}
	})

export class BeforeNode extends BaseRange<BeforeDeclaration> {
	traverseAllows: TraverseAllows<Date> =
		this.exclusive ? data => data < this.rule : data => data <= this.rule

	impliedBasis: BaseRoot = $ark.intrinsic.Date
}
