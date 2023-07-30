import { Constraint } from "./constraint.js"

export class DivisorConstraint extends Constraint<number> {
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}

	intersectRules(other: DivisorConstraint) {
		return (
			(this.rule * other.rule) / greatestCommonDivisor(this.rule, other.rule)
		)
	}
}

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
