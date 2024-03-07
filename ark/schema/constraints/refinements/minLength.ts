import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration
} from "./range.js"

export type MinLengthDeclaration = LengthRangeDeclaration<"minLength">

export type minLength<n extends number> = { minLength: n }

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
			},
			intersections: {
				minLength: (l, r) => (l.isStricterThan(r) ? l : r),
				maxLength: (min, max) =>
					min.isStricterThan(max) ? Disjoint.from("range", min, max) : null
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.limit
		: (data: LengthBoundableData) => data.length >= this.limit

	// if (
	// 	into.basis?.domain !== "string" &&
	// 	!into.basis?.extends(this.$.builtin.Array)
	// ) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
