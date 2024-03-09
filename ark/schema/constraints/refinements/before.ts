import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type DateBoundExtras,
	type DateRangeDeclaration,
	type boundToIs
} from "./range.js"

export type BeforeDeclaration = DateRangeDeclaration<"before">

export type before<date extends string> = boundToIs<"before", date>

export class BeforeNode
	extends BaseRange<BeforeDeclaration, typeof BeforeNode>
	implements DateBoundExtras
{
	static implementation: nodeImplementationOf<BeforeDeclaration> =
		this.implementBound({
			defaults: {
				description(node) {
					return node.exclusive
						? `before ${node.stringLimit}`
						: `${node.stringLimit} or earlier`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				before: (l, r) => (l.isStricterThan(r) ? l : r),
				after: (before, after, $) =>
					before.overlapsRange(after)
						? before.overlapIsUnit(after)
							? $.parse("unit", { unit: before.dateLimit })
							: null
						: Disjoint.from("range", before, after)
			}
		})

	readonly dateLimit = new Date(this.rule)
	readonly impliedBasis = this.$.jsObjects.Date

	traverseAllows = this.exclusive
		? (data: Date) => +data < this.numericLimit
		: (data: Date) => +data <= this.numericLimit
}
