import type { nodeImplementationOf } from "../../shared/implement.js"
import type { ReducibleIntersectionContext } from "../constraint.js"
import {
	BaseRange,
	dateLimitToString,
	type DateBoundExtras,
	type DateRangeDeclaration
} from "./range.js"

export type AfterDeclaration = DateRangeDeclaration<"after">

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
			}
		})

	dateLimit = new Date(this.limit)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.limit)

	traverseAllows = this.exclusive
		? (data: Date) => +data > this.numericLimit
		: (data: Date) => +data >= this.numericLimit

	reduceIntersection(into: ReducibleIntersectionContext<"after">): undefined {
		if (!into.basis?.extends(this.$.builtin.Date)) {
			this.throwInvalidBoundOperandError(into.basis)
		}
	}
}
