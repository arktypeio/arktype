import type { nodeImplementationOf } from "../../shared/implement.js"
import { BaseRange, type NumericRangeDeclaration } from "./range.js"

export type MaxDeclaration = NumericRangeDeclaration<"max">

export type max<n extends number> = { max: n }

export class MaxNode extends BaseRange<MaxDeclaration, typeof MaxNode> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "less than" : "at most"} ${inner.limit}`
				}
			},
			intersections: {
				max: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	implicitBasis = this.$.builtin.number

	traverseAllows = this.exclusive
		? (data: number) => data < this.limit
		: (data: number) => data <= this.limit

	// if (into.basis?.domain !== "number") {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
