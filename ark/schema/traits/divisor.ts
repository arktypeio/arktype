import type { reify, Trait } from "@arktype/util"
import { compose, trait } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import { composeNode } from "../node.js"
import { describable } from "./description.js"
import type { BaseConstraint, Constraint } from "./trait.js"
import { constraint } from "./trait.js"

// export interface Divisor extends BaseConstraint<Divisor, number> {}

// export const divisor = constraint<"divisor">(
// 	(l, r) => (l * r) / greatestCommonDivisor(l, r)
// )({
// 	writeDefaultDescription() {
// 		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
// 	}
// })

interface Base extends Trait {
	rule: this["args"][0]
	intersect(other: reify<this>): reify<this> | Disjoint | null
	$intersectRules: (
		l: this["rule"],
		r: this["rule"]
	) => this["rule"] | Disjoint | null
}

const base = trait<Base>({
	get rule() {
		return this.args[0]
	},
	intersect(other) {
		return this
	}
})

export interface Divisor extends Trait {
	bases: [Base]
	args: [number]
	foo: string
}

const divisor = trait<Divisor>({
	get foo() {
		return this.rule
	}
})({})

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
