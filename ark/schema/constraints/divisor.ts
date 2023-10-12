import type { BaseAttributes } from "../node.js"
import { baseChildrenProps, schema } from "../node.js"
import type { Basis } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export type DivisorSchema = number | DivisorSchemaObject

export interface DivisorSchemaObject extends BaseAttributes {
	rule: number
}

export type DivisorChildren = DivisorSchemaObject

export class DivisorNode
	extends BaseConstraint<DivisorChildren>
	implements BaseRefinement
{
	readonly kind = "divisor"

	constructor(schema: DivisorSchema) {
		super(typeof schema === "number" ? { rule: schema } : schema)
	}

	static schema = schema("number", {
		domain: "object",
		prop: [...baseChildrenProps, { key: "divisor", value: "number" }]
	})

	applicableTo(basis: Basis | undefined): basis is DomainNode<"number"> {
		return (
			basis !== undefined && basis.kind === "domain" && basis.rule === "number"
		)
	}

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`
	}

	intersectSymmetric(other: DivisorNode) {
		return {
			rule:
				(this.rule * other.rule) / greatestCommonDivisor(this.rule, other.rule)
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
