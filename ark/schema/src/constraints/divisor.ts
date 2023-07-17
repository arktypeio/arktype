import type { Constraint } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface DivisorConstraint extends Constraint {
	readonly divisor: number
}

export class DivisorNode extends ConstraintNode<DivisorConstraint> {
	readonly kind = "divisor"
	readonly id = ""
	readonly defaultDescription =
		this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`
}

export class DivisorSet extends ConstraintSet<[DivisorNode], DivisorSet> {
	intersect(other: DivisorSet) {
		const node = new DivisorNode({
			divisor: Math.abs(
				(this[0].divisor * other[0].divisor) /
					greatestCommonDivisor(this[0].divisor, other[0].divisor)
			)
		})
		return new DivisorSet(node)
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
