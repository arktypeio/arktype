import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration,
	type boundToIs
} from "./range.js"

export type MaxLengthDeclaration = LengthRangeDeclaration<"maxLength">

export type maxLength<n extends number> = boundToIs<"maxLength", n>

export class MaxLengthNode extends BaseRange<
	MaxLengthDeclaration,
	typeof MaxLengthNode
> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implementBound({
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
				minLength: (max, min, $) =>
					max.overlapsRange(min)
						? max.overlapIsUnit(min)
							? $.parse("length", { rule: max.rule })
							: null
						: Disjoint.from("range", max, min)
			}
		})

	readonly impliedBasis = this.$.lengthBoundable

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.rule
		: (data: LengthBoundableData) => data.length <= this.rule
}
