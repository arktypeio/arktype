import { Constraint, ConstraintSet } from "./constraint.js"

export class RegexConstraint extends Constraint<RegExp> {
	readonly literal = `${this.rule}` as `/${string}/${string}`

	writeDefaultDescription() {
		// don't use this.literal here since it may not have been initialized
		return `matched by ${this.rule}`
	}

	intersectRules(other: RegexConstraint) {
		return this.literal === other.literal ? this.rule : null
	}
}

export const RegexSet = ConstraintSet<readonly RegexConstraint[]>

export type RegexSet = InstanceType<typeof RegexSet>
