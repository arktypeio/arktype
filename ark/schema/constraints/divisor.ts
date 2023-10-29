import { BaseNode, type declareNode, type withAttributes } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { DomainNode } from "../bases/domain.js"
import { type Node } from "../nodes.js"
import type { BaseRefinement } from "./refinement.js"
import { getBasisName } from "./shared.js"

export type DivisorSchema = number | DivisorInner

export type DivisorInner = withAttributes<{
	readonly divisor: number
}>

export type DivisorDeclaration = declareNode<
	"divisor",
	{
		schema: DivisorSchema
		inner: DivisorInner
		intersections: {
			divisor: "divisor"
		}
	},
	typeof DivisorNode
>

export class DivisorNode
	extends BaseNode<DivisorDeclaration>
	implements BaseRefinement
{
	static readonly kind = "divisor"

	static {
		this.classesByKind.divisor = this
	}

	static from(schema: DivisorSchema) {
		return new DivisorNode(
			typeof schema === "number" ? { divisor: schema } : schema
		)
	}

	static readonly compile = this.defineCompiler(
		(inner) => `${this.argName} % ${inner.divisor} === 0`
	)

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

	static writeDefaultDescription(inner: DivisorInner) {
		return inner.divisor === 1 ? "an integer" : `a multiple of ${inner.divisor}`
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
