import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type LengthBoundableData,
	type LengthRangeDeclaration,
	type boundToIs
} from "./range.js"

export type MinLengthDeclaration = LengthRangeDeclaration<"minLength">

export type minLength<n extends number> = boundToIs<"minLength", n>

export class MinLengthNode extends BaseRange<
	MinLengthDeclaration,
	typeof MinLengthNode
> {
	static implementation: nodeImplementationOf<MinLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? inner.rule === 0
							? "non-empty"
							: `more than length ${inner.rule}`
						: inner.rule === 1
						? "non-empty"
						: `at least length ${inner.rule}`
				},
				actual: (data) => `${data.length}`
			},
			intersections: {
				minLength: (l, r) => (l.isStricterThan(r) ? l : r),
				default: () => null
			}
		})

	traverseAllows = this.exclusive
		? (data: LengthBoundableData) => data.length > this.rule
		: (data: LengthBoundableData) => data.length >= this.rule

	// if (
	// 	into.basis?.domain !== "string" &&
	// 	!into.basis?.extends(this.$.builtin.Array)
	// ) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
