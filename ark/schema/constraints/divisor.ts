import type { BaseAttributes, Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface DivisorChildren extends BaseAttributes {
	rule: number
}

export type DivisorSchema = number | DivisorChildren

export class DivisorNode
	extends BaseConstraint<DivisorChildren>
	implements BaseRefinement
{
	readonly kind = "divisor"
	readonly defaultDescription =
		this.rule === 1 ? "an integer" : `a multiple of ${this.rule}`

	static from(schema: DivisorSchema) {
		return new DivisorNode(
			typeof schema === "number" ? { rule: schema } : schema
		)
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode<"number"> {
		return (
			basis !== undefined && basis.kind === "domain" && basis.rule === "number"
		)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return writeIndivisibleMessage(`${basis}`)
	}

	hash() {
		return ""
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
