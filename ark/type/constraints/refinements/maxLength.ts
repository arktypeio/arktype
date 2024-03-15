import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LengthBoundableData,
	type boundToIs
} from "./range.js"

export type maxLength<n extends number> = boundToIs<"maxLength", n>

export interface MaxLengthInner extends BaseRangeInner {
	maxLength: number
}

export interface NormalizedMaxLengthSchema extends BaseNormalizedRangeSchema {
	maxLength: number
}

export type MaxLengthSchema = NormalizedMaxLengthSchema | number

export type MaxLengthDeclaration = declareNode<{
	kind: "maxLength"
	schema: MaxLengthSchema
	normalizedSchema: NormalizedMaxLengthSchema
	inner: MaxLengthInner
	prerequisite: LengthBoundableData
	errorContext: MaxLengthInner
}>

export class MaxLengthNode extends BaseRange<MaxLengthDeclaration> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implement({
			collapsibleKey: "maxLength",
			hasAssociatedError: true,
			keys: {
				maxLength: {},
				exclusive: parseExclusiveKey
			},
			normalize: (schema) =>
				typeof schema === "number" ? { maxLength: schema } : schema,
			defaults: {
				description(node) {
					return node.exclusive
						? `less than length ${node.limit}`
						: `at most length ${node.limit}`
				},
				actual: (data) => `${data.length}`
			},
			intersections: {
				maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
				minLength: (max, min, $) =>
					max.overlapsRange(min)
						? max.overlapIsUnit(min)
							? $.node("length", { rule: max.limit })
							: null
						: Disjoint.from("range", max, min)
			}
		})

	readonly impliedBasis = this.$.type("string|Array")

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.limit
		: (data: LengthBoundableData) => data.length <= this.limit
}
