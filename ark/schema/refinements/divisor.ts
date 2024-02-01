import { compose, type instanceOf } from "@arktype/util"
import { BaseNode } from "../base.js"
import {
	Primitive,
	type BaseMeta,
	type BaseNodeDeclaration,
	type FoldInput,
	type declareNode
} from "../shared/declare.js"
import { BaseRefinement } from "./refinement.js"

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
	intersections: {
		divisor: "divisor"
	}
	prerequisite: number
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export class DivisorNode extends compose(
	BaseNode<number, DivisorDeclaration, any>,
	Primitive<DivisorDeclaration>
)({
	get compiledCondition() {
		return `${this.$.dataArg} % ${this.divisor} === 0`
	},
	get compiledNegation() {
		return `${this.$.dataArg} % ${this.divisor} !== 0`
	},
	traverseAllows(data: number) {
		return data % this.divisor === 0
	},
	hasOpenIntersection: false,
	intersectOwnInner(r: DivisorInner) {
		return {
			divisor: Math.abs(
				(this.divisor * r.divisor) /
					greatestCommonDivisor(this.divisor, r.divisor)
			)
		}
	}
}) {
	// static implementation = this.implement({
	// 	collapseKey: "divisor",
	// 	keys: {
	// 		divisor: {}
	// 	},
	// 	normalize: (schema) =>
	// 		typeof schema === "number" ? { divisor: schema } : schema,
	// 	hasAssociatedError: true,
	// 	defaults: {
	// 		description(inner) {
	// 			return inner.divisor === 1
	// 				? "an integer"
	// 				: `a multiple of ${inner.divisor}`
	// 		}
	// 	}
	// })

	readonly constraintGroup = "shallow"

	get prerequisiteSchemas() {
		return ["number"] as const
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
