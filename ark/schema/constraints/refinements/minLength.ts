import type { nodeImplementationOf } from "../../shared/implement.js"
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
				minLength: (l, r) => (l.isStricterThan(r) ? l : r)
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
