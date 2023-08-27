import { compose } from "@arktype/util"
import { composeNode } from "../node.js"
import { describable } from "./description.js"
import type { BaseConstraint, Constraint } from "./trait.js"
import { constraint } from "./trait.js"

export interface Divisor extends BaseConstraint<Divisor, number> {}

export const divisor = constraint<"divisor">(
	(l, r) => (l * r) / greatestCommonDivisor(l, r)
)({
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}
})

const d = divisor(5, { description: "foo" }) //?

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
