import { ConstraintNode, ConstraintSet } from "./constraint.js"

export class PatternNode extends ConstraintNode<RegExp> {
	readonly literal = `${this.rule}` as `/${string}/${string}`

	writeDefaultDescription() {
		// don't use this.literal here since it may not have been initialized
		return `matched by ${this.rule}`
	}

	intersectRules(other: PatternNode) {
		return this.literal === other.literal ? this.rule : null
	}
}

export const PatternSet = ConstraintSet<readonly PatternNode[]>

export type PatternSet = InstanceType<typeof PatternSet>
