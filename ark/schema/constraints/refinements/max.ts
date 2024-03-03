import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { ReducibleIntersectionContext } from "../constraint.js"
import { BaseRange, type NumericRangeDeclaration } from "./range.js"

export type MaxDeclaration = NumericRangeDeclaration<"max">

export class MaxNode extends BaseRange<MaxDeclaration, typeof MaxNode> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "less than" : "at most"} ${inner.limit}`
				}
			}
		})

	traverseAllows = this.exclusive
		? (data: number) => data < this.limit
		: (data: number) => data <= this.limit

	reduceIntersection(
		into: ReducibleIntersectionContext<"max">
	): Disjoint | undefined {
		if (into.basis?.domain !== "number") {
			this.throwInvalidBoundOperandError(into.basis)
		}
		if (into.min?.isStricterThan(this)) {
			return Disjoint.from("range", this, into.min)
		}
	}
}
