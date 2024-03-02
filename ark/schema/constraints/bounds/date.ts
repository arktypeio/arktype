import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { FoldInput } from "../constraint.js"
import { BaseRange, type LimitSchemaValue, type declareRange } from "./range.js"

export type DateBoundKind = "before" | "after"

type DateRangeDeclaration<kind extends DateBoundKind = DateBoundKind> =
	declareRange<{
		kind: kind
		limit: string | number
		prerequisite: Date
	}>

const dateLimitToString = (limit: LimitSchemaValue) =>
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export type AfterDeclaration = DateRangeDeclaration<"after">

interface DateBoundExtras {
	dateLimit: Date
	numericLimit: number
	stringLimit: string
}

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

	foldIntersection(into: FoldInput<"after">): undefined {
		if (!into.basis?.extends(this.$.builtin.Date)) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.after = this.intersectSymmetric(into.after)
	}
}

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

	foldIntersection(into: FoldInput<"before">): Disjoint | undefined {
		if (!into.basis?.extends(this.$.builtin.Date)) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.before = this.intersectSymmetric(into.before)
		if (into.after?.isStricterThan(this)) {
			return Disjoint.from("range", this, into.after)
		}
	}
}
