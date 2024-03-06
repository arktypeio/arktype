import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import {
	BaseRange,
	dateLimitToString,
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
				description(inner) {
					const limitString = dateLimitToString(inner.rule)
					return inner.exclusive
						? `before ${limitString}`
						: `${limitString} or earlier`
				},
				actual: (data) => data.toLocaleString()
			},
			intersections: {
				before: (l, r) => (l.isStricterThan(r) ? l : r),
				after: (before, after) =>
					before.isStricterThan(after)
						? Disjoint.from("range", before, after)
						: null,
				default: () => null
			}
		})

	dateLimit = new Date(this.rule)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.rule)

	traverseAllows = this.exclusive
		? (data: Date) => +data < this.numericLimit
		: (data: Date) => +data <= this.numericLimit

	// if (!into.basis?.extends(this.$.builtin.Date)) {
	// 	this.throwInvalidBoundOperandError(into.basis)
	// }
}
