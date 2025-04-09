import { InternalPrimitiveConstraint } from "../constraint.ts"
import type { BaseRoot } from "../roots/root.ts"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { ToJsonSchema } from "../shared/unjsonifiable.ts"
import { createLengthRuleParser, type LengthBoundableData } from "./range.ts"

export declare namespace ExactLength {
	export interface Inner {
		readonly rule: number
	}

	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly rule: number
	}

	export type Schema = NormalizedSchema | number

	export interface ErrorContext
		extends BaseErrorContext<"exactLength">,
			Inner {}

	export type Declaration = declareNode<{
		kind: "exactLength"
		schema: Schema
		normalizedSchema: NormalizedSchema
		inner: Inner
		prerequisite: LengthBoundableData
		errorContext: ErrorContext
	}>

	export type Node = ExactLengthNode
}

const implementation: nodeImplementationOf<ExactLength.Declaration> =
	implementNode<ExactLength.Declaration>({
		kind: "exactLength",
		collapsibleKey: "rule",
		keys: {
			rule: {
				parse: createLengthRuleParser("exactLength")
			}
		},
		normalize: schema =>
			typeof schema === "number" ? { rule: schema } : schema,
		hasAssociatedError: true,
		defaults: {
			description: node => `exactly length ${node.rule}`,
			actual: data => `${data.length}`
		},
		intersections: {
			exactLength: (l, r, ctx) =>
				Disjoint.init(
					"unit",
					ctx.$.node("unit", { unit: l.rule }),
					ctx.$.node("unit", { unit: r.rule }),
					{ path: ["length"] }
				),
			minLength: (exactLength, minLength) =>
				exactLength.rule >= minLength.rule ?
					exactLength
				:	Disjoint.init("range", exactLength, minLength),
			maxLength: (exactLength, maxLength) =>
				exactLength.rule <= maxLength.rule ?
					exactLength
				:	Disjoint.init("range", exactLength, maxLength)
		}
	})

export class ExactLengthNode extends InternalPrimitiveConstraint<ExactLength.Declaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length === this.rule

	readonly compiledCondition: string = `data.length === ${this.rule}`
	readonly compiledNegation: string = `data.length !== ${this.rule}`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal
	readonly expression: string = `== ${this.rule}`

	reduceJsonSchema(
		schema: JsonSchema.LengthBoundable
	): JsonSchema.LengthBoundable {
		switch (schema.type) {
			case "string":
				schema.minLength = this.rule
				schema.maxLength = this.rule
				return schema
			case "array":
				schema.minItems = this.rule
				schema.maxItems = this.rule
				return schema
			default:
				return ToJsonSchema.throwInternalOperandError("exactLength", schema)
		}
	}
}

export const ExactLength = {
	implementation,
	Node: ExactLengthNode
}
