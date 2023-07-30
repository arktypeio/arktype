import { ConstraintNode, ConstraintSet } from "./constraint.js"

export class DivisorNode extends ConstraintNode<number> {
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}

	intersectRules(other: DivisorNode) {
		return (
			(this.rule * other.rule) / greatestCommonDivisor(this.rule, other.rule)
		)
	}
}

export const DivisorSet = ConstraintSet<readonly DivisorNode[]>

export type DivisorSet = InstanceType<typeof DivisorSet>

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
	let previous: number
	let greatestCommonDivisor = l
	let current = r
	while (current !== 0) {
		previous = current
		current = greatestCommonDivisor % current
		greatestCommonDivisor = previous
	}
	return greatestCommonDivisor
}
