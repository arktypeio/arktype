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
			openIntersection: true
			reducibleTo: "intersection"
			prerequisite: LengthBoundableData
			errorContext: ErrorContext
		}> {}

	export type Node = NotEqualLengthNode
}

const implementation: nodeImplementationOf<NotEqualLength.Declaration> =
	implementNode<NotEqualLength.Declaration>({
		kind: "notEqualLength",
		collapseKey: "rule",
		keys: {
			rule: {}
		},
		ownsError: true,
		openIntersection: true,
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

	readonly impliedBasis: BaseRoot = $ark.intrinsic.lengthBoundable.internal
	readonly expression: string = `!= ${this.rule}`
}

export const NotEqualLength = {
	implementation,
	Node: NotEqualLengthNode
}
