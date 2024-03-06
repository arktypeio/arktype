import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	dateLimitToString,
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
				description(inner) {
					const limitString = dateLimitToString(inner.rule)
					return inner.exclusive
						? `after ${limitString}`
						: `${limitString} or later`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				after: (l, r) => (l.isStricterThan(r) ? l : r),
				default: () => null
			}
		})

	dateLimit = new Date(this.rule)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.rule)

	traverseAllows = this.exclusive
		? (data: Date) => +data > this.numericLimit
		: (data: Date) => +data >= this.numericLimit

	// if (!into.basis?.extends(this.$.builtin.Date)) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
