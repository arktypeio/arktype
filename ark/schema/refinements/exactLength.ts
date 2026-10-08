import { InternalPrimitiveConstraint } from "../constraint.ts"
import type { BaseRoot } from "../roots/root.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { assertLengthRule, type LengthBoundableData } from "./range.ts"

export declare namespace ExactLength {
	export interface Inner {
		readonly rule: number
	}

	export interface ExpandedSchema extends BaseNodeInput {
		readonly rule: number
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext
		extends BaseErrorContext<"exactLength">,
			Inner {}

	export type Declaration = declareNode<{
		kind: "exactLength"
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
			rule: {}
		},
		hasAssociatedError: true,
		defaults: {
			description: node => `exactly length ${node.rule}`
		}
	})

export class ExactLengthNode extends InternalPrimitiveConstraint<ExactLength.Declaration> {
	constructor(
		...args: ConstructorParameters<typeof InternalPrimitiveConstraint>
	) {
		super(...args)
		assertLengthRule("exactLength", this.rule)
	}

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
