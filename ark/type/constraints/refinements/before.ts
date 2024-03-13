import type { TraverseAllows } from "../../shared/context.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
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

export type before<date extends string> = boundToIs<"before", date>

export interface BeforeInner extends BaseRangeInner {
	before: Date
}

export interface NormalizedBeforeSchema extends BaseNormalizedRangeSchema {
	before: LimitSchemaValue
}

export type BeforeSchema = NormalizedBeforeSchema | number

export type BeforeDeclaration = declareNode<{
	kind: "before"
	schema: BeforeSchema
	normalizedSchema: NormalizedBeforeSchema
	inner: BeforeInner
	prerequisite: Date
	errorContext: BeforeInner
}>

export class BeforeNode extends BaseRange<BeforeDeclaration> {
	static implementation: nodeImplementationOf<BeforeDeclaration> =
		this.implement({
			collapsibleKey: "before",
			hasAssociatedError: true,
			keys: {
				before: parseDateLimit,
				exclusive: parseExclusiveKey
			},
			normalize: (schema) =>
				typeof schema === "number" ||
				typeof schema === "string" ||
				schema instanceof Date
					? { before: schema }
					: schema,
			defaults: {
				description(node) {
					return node.exclusive
						? `before ${node.stringLimit}`
						: `${node.stringLimit} or earlier`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				before: (l, r) => (l.isStricterThan(r) ? l : r),
				after: (before, after, $) =>
					before.overlapsRange(after)
						? before.overlapIsUnit(after)
							? $.parseSchema("unit", { unit: before.limit })
							: null
						: Disjoint.from("range", before, after)
			}
		})

	readonly impliedBasis = this.$.jsObjects.Date

	traverseAllows: TraverseAllows<Date> = this.exclusive
		? (data) => +data < this.numericLimit
		: (data) => +data <= this.numericLimit
}
