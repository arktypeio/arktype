import { internalKeywords } from "../../keywords/internal.js"
import { node } from "../../parser/parse.js"
import type { declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	parseExclusiveKey,
	type BaseNormalizedRangeSchema,
	type BaseRangeInner,
	type LengthBoundableData
} from "./range.js"

export interface MaxLengthInner extends BaseRangeInner {
	rule: number
}

export interface NormalizedMaxLengthDef extends BaseNormalizedRangeSchema {
	rule: number
}

export type MaxLengthDef = NormalizedMaxLengthDef | number

export type MaxLengthDeclaration = declareNode<{
	kind: "maxLength"
	def: MaxLengthDef
	normalizedDef: NormalizedMaxLengthDef
	inner: MaxLengthInner
	prerequisite: LengthBoundableData
	errorContext: MaxLengthInner
}>

export class MaxLengthNode extends BaseRange<MaxLengthDeclaration> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implement({
			kind: "maxLength",
			collapsibleKey: "rule",
			hasAssociatedError: true,
			keys: {
				rule: {},
				exclusive: parseExclusiveKey
			},
			normalize: (def) => (typeof def === "number" ? { rule: def } : def),
			defaults: {
				description(node) {
					return node.exclusive
						? `less than length ${node.rule}`
						: `at most length ${node.rule}`
				},
				actual: (data) => `${data.length}`
			},
			intersections: {
				maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
				minLength: (max, min) =>
					max.overlapsRange(min)
						? max.overlapIsUnit(min)
							? node("exactLength", { rule: max.rule })
							: null
						: Disjoint.from("range", max, min)
			}
		})

	readonly impliedBasis = internalKeywords.lengthBoundable

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.rule
		: (data: LengthBoundableData) => data.length <= this.rule
}
