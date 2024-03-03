import type { nodeImplementationOf } from "../../shared/implement.js"
import { BaseRange, type NumericRangeDeclaration } from "./range.js"

export type MinDeclaration = NumericRangeDeclaration<"min">

export class MinNode extends BaseRange<MinDeclaration, typeof MinNode> {
	static implementation: nodeImplementationOf<MinDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "more than" : "at least"} ${inner.limit}`
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
		? (data: number) => data > this.limit
		: (data: number) => data >= this.limit
}
