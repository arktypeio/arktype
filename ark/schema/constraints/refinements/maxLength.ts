import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration
} from "./range.js"

export type MaxLengthDeclaration = LengthRangeDeclaration<"maxLength">

export type maxLength<n extends number> = { maxLength: n }

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
			},
			intersections: {
				maxLength: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.limit
		: (data: LengthBoundableData) => data.length <= this.limit

	// if (
	// 	into.basis?.domain !== "string" &&
	// 	!into.basis?.extends(this.$.builtin.Array)
	// ) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
