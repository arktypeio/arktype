import { throwParseError } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import {
	BasePrimitiveConstraint,
	getBasisName,
	type FoldInput
} from "./constraint.js"

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
	expectedContext: DivisorInner
}>

export class DivisorNode extends BasePrimitiveConstraint<
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
		intersectSymmetric: (l, r) =>
			l.$.parse("divisor", {
				divisor: Math.abs(
					(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
				)
			}),
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return inner.divisor === 1
					? "an integer"
					: `a multiple of ${inner.divisor}`
			}
		}
	})

	traverseAllows = (data: number) => data % this.divisor === 0

	compiledCondition = `${jsData} % ${this.divisor} === 0`
	compiledNegation = `${jsData} % ${this.divisor} !== 0`

	readonly expectedContext = this.createExpectedContext(this.inner)

	foldIntersection(into: FoldInput<"divisor">): undefined {
		if (into.basis?.domain !== "number") {
			throwParseError(writeIndivisibleMessage(getBasisName(into.basis)))
		}
		into.divisor = this.intersectSymmetric(into.divisor)
	}
}

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

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
