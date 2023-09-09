import type { Basis, Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode, RefinementNode } from "./constraint.js"
import type { DomainNode } from "./domain.js"

export interface DivisibilitySchema extends ConstraintSchema {
	divisor: number
}

export class DivisibilityNode extends RefinementNode<DivisibilitySchema> {
	readonly kind = "divisor"

	static parse(input: number | DivisibilitySchema) {
		return typeof input === "number" ? { divisor: input } : input
	}

	applicableTo(basis: Basis | undefined): basis is DomainNode<"number"> {
		return (
			basis !== undefined && basis.hasKind("domain") && basis.rule === "number"
		)
	}

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`
	}

	reduceWith(other: Constraint) {
		return other.kind === "divisor"
			? {
					divisor:
						(this.divisor * other.divisor) /
						greatestCommonDivisor(this.divisor, other.divisor)
			  }
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
