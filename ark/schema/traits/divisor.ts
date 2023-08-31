import { implement } from "@arktype/util"
// import type { BaseConstraint } from "./constraint.js"

import { constraintTraits } from "./constraint.js"

// export const divisor = constraint<number>((l, r) => [
// 	(l * r) / greatestCommonDivisor(l, r)
// ])({
// 	kind: "divisor",
// 	writeDefaultDescription() {
// 		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
// 	}
// })

export const divisor = implement(
	...constraintTraits<number>((l, r) => [(l * r) / greatestCommonDivisor(l, r)])
)({
	kind: "divisor",
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}
})

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
