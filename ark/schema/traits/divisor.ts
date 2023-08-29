import type { Fn } from "@arktype/util"
import { BaseConstraint, constraint } from "./constraint.js"

export abstract class DivisorConstraint2 extends BaseConstraint<
	"divisor",
	[number]
> {}

export const divisor = constraint<typeof DivisorConstraint2>(
	(l, r) => (l * r) / greatestCommonDivisor(l, r)
)({
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}
})

export const divisorConstraint = divisor as (
	...args: Parameters<typeof divisor>
) => DivisorConstraint

export interface DivisorConstraint extends ReturnType<typeof divisor> {}

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
