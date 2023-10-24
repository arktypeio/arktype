import { type BaseAttributes, BaseNode, type Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import { getBasisName } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { BaseRefinement } from "./refinement.js"

export interface DivisorChildren extends BaseAttributes {
	readonly divisor: number
}

export type DivisorSchema = number | DivisorChildren

export class DivisorNode
	extends BaseNode<DivisorChildren, typeof DivisorNode>
	implements BaseRefinement
{
	static readonly kind = "divisor"

	static from(schema: DivisorSchema) {
		return new DivisorNode(
			typeof schema === "number" ? { divisor: schema } : schema
		)
	}

	static readonly keyKinds = this.declareKeys({
		divisor: "in"
	})

	static readonly intersections = this.defineIntersections({
		divisor: (l, r) => ({
			divisor: Math.abs(
				(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
			)
		})
	})

	static writeDefaultDescription(children: DivisorChildren) {
		return children.divisor === 1
			? "an integer"
			: `a multiple of ${children.divisor}`
	}

	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is DomainNode<"number"> {
		return (
			basis !== undefined &&
			basis.kind === "domain" &&
			basis.domain === "number"
		)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return writeIndivisibleMessage(getBasisName(basis))
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
