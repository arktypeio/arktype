import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	dateLimitToString,
	type DateBoundExtras,
	type DateRangeDeclaration
} from "./range.js"

export type AfterDeclaration = DateRangeDeclaration<"after">

export type after<date extends string> = { after: date }

export class AfterNode
	extends BaseRange<AfterDeclaration, typeof AfterNode>
	implements DateBoundExtras
{
	static implementation: nodeImplementationOf<AfterDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					const limitString = dateLimitToString(inner.limit)
					return inner.exclusive
						? `after ${limitString}`
						: `${limitString} or later`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				after: (l, r) => (l.isStricterThan(r) ? l : r),
				before: (after, before) =>
					after.isStricterThan(before)
						? Disjoint.from("range", after, before)
						: null
			}
		})

	implicitBasis = this.$.builtin.Date

	dateLimit = new Date(this.limit)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.limit)

	traverseAllows = this.exclusive
		? (data: Date) => +data > this.numericLimit
		: (data: Date) => +data >= this.numericLimit

	// if (!into.basis?.extends(this.$.builtin.Date)) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
