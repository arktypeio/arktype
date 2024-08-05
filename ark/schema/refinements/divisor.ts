import {
	InternalPrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.js"
import type { BaseRoot } from "../roots/root.js"
import type {
	BaseErrorContext,
	BaseInner,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"

export namespace Divisor {
	export interface Inner extends BaseInner {
		readonly rule: number
	}

	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly rule: number
	}

	export type Schema = Inner | number

	export interface ErrorContext extends BaseErrorContext<"divisor">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "divisor"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: number
			errorContext: ErrorContext
		}> {}

	export type Node = DivisorNode
}

const implementation: nodeImplementationOf<Divisor.Declaration> =
	implementNode<Divisor.Declaration>({
		kind: "divisor",
		collapsibleKey: "rule",
		keys: {
			rule: {}
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description: node =>
				node.rule === 1 ? "an integer" : `a multiple of ${node.rule}`
		},
		intersections: {
			divisor: (l, r, ctx) =>
				ctx.$.node("divisor", {
					rule: Math.abs(
						(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
					)
				})
		}
	})

export class DivisorNode extends InternalPrimitiveConstraint<Divisor.Declaration> {
	traverseAllows: TraverseAllows<number> = data => data % this.rule === 0

	readonly compiledCondition: string = `data % ${this.rule} === 0`
	readonly compiledNegation: string = `data % ${this.rule} !== 0`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.number.internal
	readonly expression: string = `% ${this.rule}`
}

export const Divisor = {
	implementation,
	Node: DivisorNode
}

export const writeIndivisibleMessage = (t: BaseRoot): string =>
	writeInvalidOperandMessage("divisor", $ark.intrinsic.number as never, t)

export type writeIndivisibleMessage<actual> = writeInvalidOperandMessage<
	"divisor",
	actual
>

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
