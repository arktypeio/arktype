import type { conform } from "@arktype/util"
import { Hkt } from "@arktype/util"
import type { BaseSchema, Node } from "../schema.js"
import { BaseNode, nodeParser } from "../schema.js"
import type { Basis } from "./basis.js"
import type { DomainNode } from "./domain.js"

export interface DivisibilitySchema extends BaseSchema {
	divisor: number
}

export type DivisibilityInput = number | DivisibilitySchema

export class DivisibilityNode extends BaseNode<DivisibilitySchema> {
	readonly kind = "divisor"

	protected constructor(schema: DivisibilitySchema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], DivisibilityInput>) => {
			return new DivisibilityNode(
				typeof input === "number" ? { divisor: input } : input
			)
		}
	})()

	static from = nodeParser(this)

	applicableTo(
		basis: Basis | undefined
	): basis is DomainNode<{ domain: "number" }> {
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

	intersectOwnKeys(other: Node) {
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
