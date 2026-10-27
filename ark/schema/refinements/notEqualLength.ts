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

export declare namespace NotEqualLength {
	export interface Inner {
		readonly rule: number
	}

	export interface ExpandedSchema extends BaseNodeInput {
		readonly rule: number
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext
		extends BaseErrorContext<"notEqualLength">,
			Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "notEqualLength"
			inner: Inner
			stacks: true
			reducibleTo: "intersection"
			prerequisite: LengthBoundableData
			errorCtx: ErrorContext
		}> {}

	export type Node = NotEqualLengthNode
}

const implementation: nodeImplementationOf<NotEqualLength.Declaration> =
	implementNode<NotEqualLength.Declaration>({
		kind: "notEqualLength",
		bareKey: "rule",
		keys: {
			rule: {}
		},
		ownErr: true,
		stacks: true,
		defaults: {
			description: node => `other than length ${node.rule}`
		}
	})

export class NotEqualLengthNode extends InternalPrimitiveConstraint<NotEqualLength.Declaration> {
	constructor(
		...args: ConstructorParameters<typeof InternalPrimitiveConstraint>
	) {
		super(...args)
		assertLengthRule("notEqualLength", this.rule)
	}

	traverseAllows(data: LengthBoundableData): boolean {
		return data.length !== this.rule
	}

	compileCondition(js: NodeCompiler, data: string): string {
		return `${data}.length !== ${this.rule}`
	}

	readonly implied: BaseRoot = $ark.kw.lengthBoundable.internal
	readonly expression: string = `!= ${this.rule}`
}

export const NotEqualLength = {
	impl: implementation,
	Node: NotEqualLengthNode
}
