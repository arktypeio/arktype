import { compose, type extend, trait } from "@arktype/util"
import { BaseNode, composeNode } from "../node.js"
import { describable } from "./description.js"
import type { ConstraintImplementation } from "./trait.js"
import { RuleNode } from "./trait.js"

export class DivisorNode extends composeNode() {
	declare readonly value: number
	readonly kind = "divisor"

	constructor(def: { value: number }) {
		super()
		this.value = def.value
	}

	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}

	protected reduceRules(other: DivisorNode) {
		return {
			value:
				(this.value * other.value) /
				greatestCommonDivisor(this.value, other.value)
		}
	}
}

export const divisor = compose(describable)<[number], { rule: number }>({
	get rule() {
		return this.args[0]
	},
	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}
})

const d = divisor(5, { description: "foo" }) //?

type Divisor = typeof divisor

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
