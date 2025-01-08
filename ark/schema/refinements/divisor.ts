import {
	InternalPrimitiveConstraint,
	writeInvalidOperandMessage
} from "../constraint.ts"
import type { BaseRoot } from "../roots/root.ts"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"

export declare namespace Divisor {
	export interface Inner {
		readonly rule: number
	}

	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly rule: number
	}

	export type Schema = NormalizedSchema | number

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
				node.rule === 1 ? "an integer"
				: node.rule === 2 ? "even"
				: `a multiple of ${node.rule}`
		},
		intersections: {
			divisor: (l, r, ctx) =>
				ctx.$.node("divisor", {
					rule: Math.abs(
						(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
					)
				})
		},
		obviatesBasisDescription: true
	})

export class DivisorNode extends InternalPrimitiveConstraint<Divisor.Declaration> {
	traverseAllows: TraverseAllows<number> = data => data % this.rule === 0

	readonly compiledCondition: string = `data % ${this.rule} === 0`
	readonly compiledNegation: string = `data % ${this.rule} !== 0`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.number.internal
	readonly expression: string = `% ${this.rule}`

	reduceJsonSchema(schema: JsonSchema.Numeric): JsonSchema.Numeric {
		schema.type = "integer"

		if (this.rule === 1) return schema

		schema.multipleOf = this.rule

		return schema
	}
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
