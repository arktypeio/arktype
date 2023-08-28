import type { reify, Trait } from "@arktype/util"
import { trait } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import { type BaseConstraint, constraint } from "./constraint.js"

// export interface Divisor extends BaseConstraint<Divisor, number> {}

// export const divisor = constraint<"divisor">(
// 	(l, r) => (l * r) / greatestCommonDivisor(l, r)
// )({
// 	writeDefaultDescription() {
// 		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
// 	}
// })

export interface Divisor extends BaseConstraint<"divisor"> {
	$args: [number]
}

const divisor = constraint<Divisor>(
	(l, r) => (l * r) / greatestCommonDivisor(l, r)
)({
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}
})
// 	({
// 	writeDefaultDescription() {
// 		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
// 	}
// })
// 	({
// 	get foo() {
// 		return `${this.rule}`
// 	}
// })({
// 	intersectRules: (l, r) => l.rule
// })

const d = divisor(5) //?

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
