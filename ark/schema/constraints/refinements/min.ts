import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import { BaseRange, type NumericRangeDeclaration } from "./range.js"

export type MinDeclaration = NumericRangeDeclaration<"min">

export type min<n extends number> = { min: n }

export class MinNode extends BaseRange<MinDeclaration, typeof MinNode> {
	static implementation: nodeImplementationOf<MinDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "more than" : "at least"} ${inner.limit}`
				}
			},
			intersections: {
				min: (l, r) => (l.isStricterThan(r) ? l : r),
				max: (min, max) =>
					min.isStricterThan(max) ? Disjoint.from("range", min, max) : null
			}
		})

	implicitBasis = this.$.builtin.number

	// if (into.basis?.domain !== "number") {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }

	traverseAllows = this.exclusive
		? (data: number) => data > this.limit
		: (data: number) => data >= this.limit
}
