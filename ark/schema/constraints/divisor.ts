import type { BaseRule } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export interface DivisorRule extends BaseRule {
	readonly value: number
}

export class DivisorConstraint extends ConstraintNode<DivisorRule> {
	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}

	protected reduceWithRuleOf(other: ConstraintNode): DivisorRule | null {
		return other.hasKind("divisor")
			? {
					value:
						(this.value * other.value) /
						greatestCommonDivisor(this.value, other.value)
			  }
			: null
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

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`
