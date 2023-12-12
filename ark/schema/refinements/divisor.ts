import { compose, type TraitConstructor } from "@arktype/util"
import { BaseNode } from "../base.js"
import {
	PrimitiveNode,
	type declareNode,
	type withAttributes
} from "../shared/declare.js"
import type { NodeParserImplementation } from "../shared/define.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { RefinementTrait } from "./shared.js"

export type DivisorInner = {
	readonly divisor: number
}

export type NormalizedDivisorSchema = withAttributes<DivisorInner>

export type DivisorSchema = NormalizedDivisorSchema | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	schema: DivisorSchema
	normalizedSchema: NormalizedDivisorSchema
	inner: DivisorInner
	intersections: {
		divisor: "divisor"
	}
	checks: number
}>

export const writeIndivisibleMessage = <root extends string>(
	root: root
): writeIndivisibleMessage<root> =>
	`Divisibility operand ${root} must be a number`

export type writeIndivisibleMessage<root extends string> =
	`Divisibility operand ${root} must be a number`

export class DivisorNode extends compose(
	BaseNode<number, DivisorDeclaration>,
	RefinementTrait<DivisorDeclaration>,
	PrimitiveNode<DivisorDeclaration>
)({
	traverseAllows(data: number) {
		return data % this.divisor === 0
	},
	get condition() {
		return `${this.scope.argName} % ${this.divisor} === 0`
	},
	get negatedCondition() {
		return `${this.scope.argName} % ${this.divisor} !== 0`
	},
	hasOpenIntersection: false,
	getCheckedDefinitions: () => ["number"] as const,
	writeDefaultDescription() {
		return this.divisor === 1 ? "an integer" : `a multiple of ${this.divisor}`
	}
}) {
	static parser: NodeParserImplementation<DivisorDeclaration> = {
		collapseKey: "divisor",
		keys: {
			divisor: {}
		},
		normalize: (schema) =>
			typeof schema === "number" ? { divisor: schema } : schema
	}

	static intersections: NodeIntersections<DivisorDeclaration> = {
		divisor: (l, r) => ({
			divisor: Math.abs(
				(l.divisor * r.divisor) / greatestCommonDivisor(l.divisor, r.divisor)
			)
		})
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
