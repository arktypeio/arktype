import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type NumericRangeDeclaration,
	type boundToIs
} from "./range.js"

export type MaxDeclaration = NumericRangeDeclaration<"max">

export type max<n extends number> = boundToIs<"max", n>

export class MaxNode extends BaseRange<MaxDeclaration, typeof MaxNode> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		this.implementBound({
			defaults: {
				description(node) {
					return `${node.exclusive ? "less than" : "at most"} ${node.rule}`
				}
			},
			intersections: {
				max: (l, r) => (l.isStricterThan(r) ? l : r),
				min: (max, min, $) =>
					max.overlapsRange(min)
						? max.overlapIsUnit(min)
							? $.parse("unit", { unit: max.rule })
							: null
						: Disjoint.from("range", max, min)
			}
		})

	readonly impliedBasis = this.$.tsKeywords.number

	traverseAllows = this.exclusive
		? (data: number) => data < this.rule
		: (data: number) => data <= this.rule
}
