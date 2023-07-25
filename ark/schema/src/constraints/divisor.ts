import type { ConstraintDefinition } from "./constraint.js"
import { Constraint } from "./constraint.js"

export interface DivisibilityDefinition extends ConstraintDefinition {
	readonly divisor: number
}

export class DivisibilityConstraint extends Constraint<
	DivisibilityDefinition,
	typeof DivisibilityConstraint
> {
	readonly divisor = this.definition.divisor
	readonly description =
		this.definition.description ??
		(this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`)

	intersectOwnKeys(other: DivisibilityConstraint) {
		return {
			divisor: Math.abs(
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
