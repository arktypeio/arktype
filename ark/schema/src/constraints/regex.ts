import type { Constraint } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface RegexConstraint extends Constraint {
	readonly source: string
	readonly flags: string
}

export class RegexNode extends ConstraintNode<RegexConstraint> {
	literal = `/${this.source}/${this.flags}`
	defaultDescription = `matched by ${this.literal}`
}

export class RegexSet extends ConstraintSet<readonly RegexNode[], RegexSet> {
	intersect(other: RegexSet) {
		const matching = this.find(
			(existing) =>
				other.source === existing.source && other.flags === existing.flags
		)
		return matching ? this : new RegexSet(...this, other)
	}
}
