import { InternalPrimitiveConstraint } from "../constraint.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
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
		errorCtx: ErrorContext
	}>

	export type Node = ExactLengthNode
}

const implementation: nodeImplementationOf<ExactLength.Declaration> =
	implementNode<ExactLength.Declaration>({
		kind: "exactLength",
		bareKey: "rule",
		keys: {
			rule: {}
		},
		ownErr: true,
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

	traverseAllows(data: LengthBoundableData): boolean {
		return data.length === this.rule
	}

	compileCondition(js: NodeCompiler, data: string): string {
		return `${data}.length === ${this.rule}`
	}

	readonly implied: BaseRoot = $ark.kw.lengthBoundable.internal
	readonly expression: string = `== ${this.rule}`
}

export const ExactLength = {
	impl: implementation,
	Node: ExactLengthNode
}
