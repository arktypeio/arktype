import { BaseNode } from "../base.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { PrimitiveAttachmentsInput } from "../shared/implement.js"
import { BaseRefinement, type FoldInput } from "./refinement.js"

export interface DivisorInner extends BaseMeta {
	readonly divisor: number
}

export type NormalizedDivisorSchema = DivisorInner

export type DivisorSchema = NormalizedDivisorSchema | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	normalizedSchema: NormalizedDivisorSchema
	inner: DivisorInner
	composition: "primitive"
	prerequisite: number
	attachments: PrimitiveAttachmentsInput
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export class DivisorNode extends BaseRefinement<
	DivisorDeclaration,
	typeof DivisorNode
> {
	static implementation = this.implement({
		collapseKey: "divisor",
		keys: {
			divisor: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { divisor: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.divisor === 1
					? "an integer"
					: `a multiple of ${inner.divisor}`
			}
		},
		attachments: (base) => ({
			primitive: true,
			compiledCondition: `${base.$.dataArg} % ${base.divisor} === 0`,
			compiledNegation: `${base.$.dataArg} % ${base.divisor} !== 0`
		})
	})

	readonly constraintGroup = "shallow"
	readonly hasOpenIntersection = false
	traverseAllows = (data: number) => data % this.divisor === 0

	get prerequisiteSchemas() {
		return ["number"] as const
	}

	intersectOwnInner(r: DivisorNode) {
		return {
			divisor: Math.abs(
				(this.divisor * r.divisor) /
					greatestCommonDivisor(this.divisor, r.divisor)
			)
		}
	}

	foldIntersection(into: FoldInput<"divisor">) {
		into.divisor = this.intersectOwnKind(into.divisor)
		return into
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
