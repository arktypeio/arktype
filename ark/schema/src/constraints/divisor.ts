import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface DivisorConstraint extends Constraint {
	readonly divisor: number
}

export class DivisorNode extends ConstraintNode<
	DivisorConstraint,
	DivisorNode
> {
	readonly kind = "divisor"
	readonly id = ""
	readonly defaultDescription =
		this.constraint.divisor === 1
			? "an integer"
			: `a multiple of ${this.constraint.divisor}`

	intersect(other: DivisorNode) {
		return new DivisorNode({
			divisor: Math.abs(
				// TODO: fix type
				(this[0].divisor * other[0].divisor) /
					greatestCommonDivisor(this[0].divisor, other[0].divisor)
			)
		})
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
