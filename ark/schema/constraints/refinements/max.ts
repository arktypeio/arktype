import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import { BaseRange, type NumericRangeDeclaration } from "./range.js"

export type MaxDeclaration = NumericRangeDeclaration<"max">

export class MaxNode extends BaseRange<MaxDeclaration, typeof MaxNode> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "less than" : "at most"} ${inner.rule}`
				}
			},
			intersections: {
				max: (l, r) => (l.isStricterThan(r) ? l : r),
				min: (max, min) =>
					max.isStricterThan(min) ? Disjoint.from("range", max, min) : null
			}
		})

	traverseAllows = this.exclusive
		? (data: number) => data < this.rule
		: (data: number) => data <= this.rule

	// if (into.basis?.domain !== "number") {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
