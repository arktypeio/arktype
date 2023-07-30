import type { mutable } from "@arktype/util"
import { ReadonlyArray } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes, BaseNode } from "../node.js"

export abstract class ConstraintNode<
	rule,
	attributes extends BaseAttributes = BaseAttributes
> {
	constructor(
		public rule: rule,
		public attributes = {} as attributes
	) {}

	abstract writeDefaultDescription(): string

	abstract intersectRules(other: this): rule | Disjoint | null

	intersect(other: this) {
		const ruleIntersection = this.intersectRules(other)
		if (ruleIntersection === null || ruleIntersection instanceof Disjoint) {
			// Ensure the signature of this method reflects whether Disjoint and/or null
			// are possible intersection results for the subclass.
			return ruleIntersection as Exclude<
				ReturnType<this["intersectRules"]>,
				rule
			>
		}
		return new (this.constructor as any)(ruleIntersection) as this
	}
}

type ConstraintList = readonly ConstraintNode<unknown>[]

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
