import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { FoldInput } from "../constraint.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration
} from "./range.js"

export type MaxLengthDeclaration = LengthRangeDeclaration<"maxLength">

export class MaxLengthNode extends BaseRange<
	MaxLengthDeclaration,
	typeof MaxLengthNode
> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? `less than length ${inner.limit}`
						: `at most length ${inner.limit}`
				},
				actual: (data) => `${data.length}`
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.limit
		: (data: LengthBoundableData) => data.length <= this.limit

	foldIntersection(into: FoldInput<"maxLength">): Disjoint | undefined {
		if (
			into.basis?.domain !== "string" &&
			!into.basis?.extends(this.$.builtin.Array)
		) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.maxLength = this.intersectSymmetric(into.maxLength)
		if (into.minLength?.isStricterThan(this)) {
			return Disjoint.from("range", this, into.minLength)
		}
	}
}
