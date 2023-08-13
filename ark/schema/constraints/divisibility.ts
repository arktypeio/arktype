import type { satisfy } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import type { NodeDefinition } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export type DivisorDefinition = satisfy<
	NodeDefinition,
	{
		kind: "divisor"
		rule: number
		attributes: UniversalAttributes
		node: DivisorConstraint
	}
>

export class DivisorConstraint extends ConstraintNode<DivisorDefinition> {
	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}

	compare(other: ConstraintNode): number | null {
		return other.hasKind("divisor")
			? (this.rule * other.rule) / greatestCommonDivisor(this.rule, other.rule)
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
