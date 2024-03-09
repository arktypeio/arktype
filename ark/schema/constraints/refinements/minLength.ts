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
				description(node) {
					return node.exclusive
						? node.rule === 0
							? "non-empty"
							: `more than length ${node.rule}`
						: node.rule === 1
						? "non-empty"
						: `at least length ${node.rule}`
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

	readonly impliedBasis = this.$.lengthBoundable
}
