import type { NodeSubclass } from "../../base.js"
import { jsData } from "../../shared/compile.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { nodeImplementationOf } from "../../shared/implement.js"
import type { FoldInput } from "../constraint.js"
import {
	BaseRange,
	negatedComparators,
	type BaseRangeDeclaration,
	type declareRange
} from "./range.js"

export type NumericBoundKind = "min" | "max"

type NumericBoundDeclaration<kind extends NumericBoundKind = NumericBoundKind> =
	declareRange<{
		kind: kind
		limit: number
		prerequisite: number
	}>

abstract class BaseNumericBound<
	d extends BaseRangeDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseRange<d, subclass> {
	compiledActual = jsData
	compiledCondition = `${this.compiledActual} ${this.comparator} ${this.limit}`
	compiledNegation = `${this.compiledActual} ${
		negatedComparators[this.comparator]
	} ${this.limit}`
}

export type MinDeclaration = NumericBoundDeclaration<"min">

export class MinNode extends BaseNumericBound<MinDeclaration, typeof MinNode> {
	static implementation: nodeImplementationOf<MinDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "more than" : "at least"} ${inner.limit}`
				}
			}
		})

	foldIntersection(into: FoldInput<"min">): undefined {
		if (into.basis?.domain !== "number") {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.min = this.intersectSymmetric(into.min)
	}

	traverseAllows = this.exclusive
		? (data: number) => data > this.limit
		: (data: number) => data >= this.limit
}

export type MaxDeclaration = NumericBoundDeclaration<"max">

export class MaxNode extends BaseNumericBound<MaxDeclaration, typeof MaxNode> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "less than" : "at most"} ${inner.limit}`
				}
			}
		})

	traverseAllows = this.exclusive
		? (data: number) => data < this.limit
		: (data: number) => data <= this.limit

	foldIntersection(into: FoldInput<"max">): Disjoint | undefined {
		if (into.basis?.domain !== "number") {
			this.throwInvalidBoundOperandError(into.basis)
		}
		if (into.min?.isStricterThan(this)) {
			return Disjoint.from("range", this, into.min)
		}
		into.max = this.intersectSymmetric(into.max)
	}
}
