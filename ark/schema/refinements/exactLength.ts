import { InternalPrimitiveConstraint } from "../constraint.ts"
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
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
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
		}
	})

export class ExactLengthNode extends InternalPrimitiveConstraint<ExactLength.Declaration> {
	traverseAllows: TraverseAllows<LengthBoundableData> = data =>
		data.length === this.rule

	readonly compiledCondition: string = `data.length === ${this.rule}`
	readonly compiledNegation: string = `data.length !== ${this.rule}`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal
	readonly expression: string = `== ${this.rule}`
}

export const ExactLength = {
	implementation,
	Node: ExactLengthNode
}
