import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { ReducibleIntersectionContext } from "../constraint.js"
import {
	BaseRange,
	dateLimitToString,
	type DateBoundExtras,
	type DateRangeDeclaration
} from "./range.js"

export type BeforeDeclaration = DateRangeDeclaration<"before">

export class BeforeNode
	extends BaseRange<BeforeDeclaration, typeof BeforeNode>
	implements DateBoundExtras
{
	static implementation: nodeImplementationOf<BeforeDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					const limitString = dateLimitToString(inner.limit)
					return inner.exclusive
						? `before ${limitString}`
						: `${limitString} or earlier`
				},
				actual: (data) => data.toLocaleString()
			}
		})

	dateLimit = new Date(this.limit)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.limit)

	traverseAllows = this.exclusive
		? (data: Date) => +data < this.numericLimit
		: (data: Date) => +data <= this.numericLimit

	reduceIntersection(
		into: ReducibleIntersectionContext<"before">
	): Disjoint | undefined {
		if (!into.basis?.extends(this.$.builtin.Date)) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.before = this.intersectSymmetric(into.before)
		if (into.after?.isStricterThan(this)) {
			return Disjoint.from("range", this, into.after)
		}
	}
}
