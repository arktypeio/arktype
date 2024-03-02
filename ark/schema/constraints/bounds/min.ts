import type { nodeImplementationOf } from "../../shared/implement.js"
import type { FoldInput } from "../constraint.js"
import { BaseRange, type NumericRangeDeclaration } from "./range.js"

export type MinDeclaration = NumericRangeDeclaration<"min">

export class MinNode extends BaseRange<MinDeclaration, typeof MinNode> {
	static implementation: nodeImplementationOf<MinDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "more than" : "at least"} ${inner.limit}`
				}
			}
		})

	foldIntersection(into: FoldInput<"min">): undefined {
		if (into.basis?.domain !== "number") {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.min = this.intersectSymmetric(into.min)
	}

	traverseAllows = this.exclusive
		? (data: number) => data > this.limit
		: (data: number) => data >= this.limit
}
