import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	type DateBoundExtras,
	type DateRangeDeclaration,
	type boundToIs
} from "./range.js"

export type AfterDeclaration = DateRangeDeclaration<"after">

export type after<date extends string> = boundToIs<"after", date>

export class AfterNode
	extends BaseRange<AfterDeclaration, typeof AfterNode>
	implements DateBoundExtras
{
	static implementation: nodeImplementationOf<AfterDeclaration> =
		this.implementBound({
			defaults: {
				description(node) {
					return node.exclusive
						? `after ${node.stringLimit}`
						: `${node.stringLimit} or later`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				after: (l, r) => (l.isStricterThan(r) ? l : r)
			}
		})

	readonly dateLimit = new Date(this.rule)
	readonly impliedBasis = this.$.jsObjects.Date

	traverseAllows = this.exclusive
		? (data: Date) => +data > this.numericLimit
		: (data: Date) => +data >= this.numericLimit
}
