import { compose, implement } from "@arktype/util"
import { Fingerprinted } from "../node.js"
import { constraintTraits } from "./constraint.js"

abstract class Divisor extends compose(
	...constraintTraits<number>((l, r) => [
		(l * r) / greatestCommonDivisor(l, r)
	]),
	Fingerprinted
) {}

export const divisor = implement(Divisor)({
	kind: "divisor",
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	},
	hash: () => ""
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
