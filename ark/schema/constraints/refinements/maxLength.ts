import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration,
	type boundToIs
} from "./range.js"

export type MaxLengthDeclaration = LengthRangeDeclaration<"maxLength">

export type maxLength<n extends number> = boundToIs<"maxLength", n>

export class MaxLengthNode extends BaseRange<
	MaxLengthDeclaration,
	typeof MaxLengthNode
> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? `less than length ${inner.rule}`
						: `at most length ${inner.rule}`
				},
				actual: (data) => `${data.length}`
			},
			intersections: {
				maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
				minLength: (max, min) =>
					max.isStricterThan(min) ? Disjoint.from("range", max, min) : null,
				default: () => null
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length < this.rule
		: (data: LengthBoundableData) => data.length <= this.rule

	// if (
	// 	into.basis?.domain !== "string" &&
	// 	!into.basis?.extends(this.$.builtin.Array)
	// ) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
