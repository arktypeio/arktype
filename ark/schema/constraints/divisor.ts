import type { BaseAttributes, Prevalidated } from "../node.js"
import { baseChildrenProps, schema } from "../node.js"
import type { Basis } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export type DivisibilityInput = number | DivisibilitySchema

export interface DivisibilitySchema extends BaseAttributes {
	divisor: number
}

export type DivisibilityChildren = DivisibilitySchema

export class DivisibilityNode
	extends BaseConstraint<DivisibilityChildren>
	implements BaseRefinement
{
	readonly kind = "divisor"

	constructor(schema: DivisibilitySchema, prevalidated?: Prevalidated) {
		super(typeof schema === "number" ? { divisor: schema } : schema)
	}

	static schema = schema("number", {
		domain: "object",
		prop: [...baseChildrenProps, { key: "divisor", value: "number" }]
	})

	applicableTo(basis: Basis | undefined): basis is DomainNode<"number"> {
		return (
			basis !== undefined &&
			basis.kind === "domain" &&
			basis.domain === "number"
		)
	}

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`
	}

	intersectSymmetric(other: DivisibilityNode) {
		return {
			divisor:
				(this.divisor * other.divisor) /
				greatestCommonDivisor(this.divisor, other.divisor)
		}
	}

	intersectAsymmetric() {
		return null
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
