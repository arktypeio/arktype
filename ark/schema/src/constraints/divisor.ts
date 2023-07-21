import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface DivisibilityConstraint extends Constraint {
	readonly divisor: number
}

export class DivisibilityNode extends ConstraintNode<DivisibilityConstraint> {
	readonly kind = "divisor"
	readonly id = ""
	readonly divisor = this.constraint.divisor
	readonly description =
		this.constraint.description ??
		(this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`)

	intersectConstraints(other: DivisibilityNode) {
		return {
			divisor: Math.abs(
				// TODO: fix type
				(this.divisor * other.divisor) /
					greatestCommonDivisor(this.divisor, other.divisor)
			)
		}
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
