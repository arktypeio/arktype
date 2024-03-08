import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type NumericRangeDeclaration,
	type boundToIs
} from "./range.js"

export type MinDeclaration = NumericRangeDeclaration<"min">

export type min<n extends number> = boundToIs<"min", n>

export class MinNode extends BaseRange<MinDeclaration, typeof MinNode> {
	static implementation: nodeImplementationOf<MinDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "more than" : "at least"} ${inner.rule}`
				}
			},
			intersections: {
				min: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	// if (into.basis?.domain !== "number") {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }

	traverseAllows = this.exclusive
		? (data: number) => data > this.rule
		: (data: number) => data >= this.rule
}
