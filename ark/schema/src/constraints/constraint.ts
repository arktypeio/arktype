import type { extend, mutable } from "@arktype/util"
import { ReadonlyArray } from "@arktype/util"
import type { BaseNode } from "../base.js"
import { Disjoint } from "../disjoint.js"
import type { BoundSet } from "./bound.js"
import type { DivisorSet } from "./divisor.js"
import type { NarrowSet } from "./narrow.js"
import type { PatternSet } from "./pattern.js"
import type { PrototypeSet } from "./prototype.js"

export const constraintKinds = [
	"bound",
	"divisor",
	"narrow",
	"pattern",
	"prototype"
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export type ConstraintSetsByKind = extend<
	Record<ConstraintKind, ConstraintSet>,
	{
		bound: BoundSet
		divisor: DivisorSet
		narrow: NarrowSet
		pattern: PatternSet
		prototype: PrototypeSet
	}
>

type ConstraintList = readonly BaseNode<any, any>[]

/** @ts-expect-error allow extending narrowed readonly array */
export class ConstraintSet<
	constraints extends ConstraintList = ConstraintList
> extends ReadonlyArray<constraints> {
	// TODO: make sure in cases like range, the result is sorted
	add(constraint: constraints[number]): ConstraintSet<constraints> | Disjoint {
		const result = [] as unknown as mutable<constraints>
		let includesConstraint = false
		for (let i = 0; i < this.length; i++) {
			const elementResult = this[i].intersect(constraint)
			if (elementResult === null) {
				result.push(this[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else {
				result.push(elementResult)
				includesConstraint = true
			}
		}
		if (!includesConstraint) {
			result.push(constraint)
		}
		return new ConstraintSet(...result)
	}
}
