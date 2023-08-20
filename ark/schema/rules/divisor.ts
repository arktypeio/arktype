import type { extend } from "@arktype/util"
import { BaseNode } from "../node.js"
import { RuleNode } from "./rule.js"

export class DivisorNode extends BaseNode<typeof DivisorNode> {
	declare readonly value: number
	readonly kind = "divisor"

	static keymap = {
		value: null
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
