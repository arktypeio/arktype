import type { nodeImplementationOf } from "../../shared/implement.js"
import type { ReducibleIntersectionContext } from "../constraint.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration
} from "./range.js"

export type MinLengthDeclaration = LengthRangeDeclaration<"minLength">

export class MinLengthNode extends BaseRange<
	MinLengthDeclaration,
	typeof MinLengthNode
> {
	static implementation: nodeImplementationOf<MinLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? inner.limit === 0
							? "non-empty"
							: `more than length ${inner.limit}`
						: inner.limit === 1
						? "non-empty"
						: `at least length ${inner.limit}`
				},
				actual: (data) => `${data.length}`
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.limit
		: (data: LengthBoundableData) => data.length >= this.limit

	reduceIntersection(
		into: ReducibleIntersectionContext<"minLength">
	): undefined {
		if (
			into.basis?.domain !== "string" &&
			!into.basis?.extends(this.$.builtin.Array)
		) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.minLength = this.intersectSymmetric(into.minLength)
	}
}
