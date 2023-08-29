import type { BaseConstraint } from "./constraint.js"
import { constraint } from "./constraint.js"

export interface DivisorConstraint extends BaseConstraint<number> {}

export const divisor = constraint<DivisorConstraint>(
	(l, r) => (l * r) / greatestCommonDivisor(l, r)
)({
	kind: "divisor",
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}
})

const d = divisor(5)

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
