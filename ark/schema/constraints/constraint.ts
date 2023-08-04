import type { extend, mutable } from "@arktype/util"
import { ReadonlyArray } from "@arktype/util"
import type { AttributesRecord } from "../attributes/attribute.js"
import type { DescriptionAttribute } from "../attributes/description.js"
import { Disjoint } from "../disjoint.js"
import type { IntersectableRecord } from "../shared.js"

export type ConstraintAttributes<attributes extends AttributesRecord> = extend<
	{ readonly description?: DescriptionAttribute },
	attributes
>

export abstract class Constraint<
	rule,
	attributes extends
		ConstraintAttributes<AttributesRecord> = ConstraintAttributes<{}>
> {
	constructor(
		public rule: rule,
		public attributes = {} as attributes
	) {}

	declare readonly id: string

	abstract writeDefaultDescription(): string

	abstract intersectRules(other: this): rule | Disjoint | null

	equals(other: this) {
		return this.id === other.id
	}

	intersect(other: this) {
		const ruleIntersection = this.intersectRules(other)
		if (ruleIntersection === null || ruleIntersection instanceof Disjoint) {
			// Ensure the signature of this method reflects whether Disjoint and/or null
			// are possible intersection results for the subclass.
			return ruleIntersection as Extract<
				ReturnType<this["intersectRules"]>,
				null | Disjoint
			>
		}
		return new (this.constructor as any)(ruleIntersection) as this
	}
}

type ConstraintList = readonly Constraint<unknown>[]

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

	intersect(other: ConstraintSet<constraints>) {
		let setResult: ConstraintSet<constraints> | Disjoint = this
		for (
			let i = 0;
			i < other.length && setResult instanceof ConstraintSet;
			i++
		) {
			setResult = setResult.add(other[i])
		}
		return setResult
	}
}

export type ConstraintsRecord = IntersectableRecord
