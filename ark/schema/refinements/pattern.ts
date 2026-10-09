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

export declare namespace Pattern {
	export interface ExpandedSchema extends BaseNodeInput {
		readonly rule: string
		readonly flags?: string
	}

	export interface Inner {
		readonly rule: string
		readonly flags?: string
	}

	export type Schema = ExpandedSchema | string | RegExp

	export interface ErrorContext extends BaseErrorContext<"pattern">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "pattern"
			inner: Inner
			intersectionIsOpen: true
			prerequisite: string
			errorContext: ErrorContext
		}> {}

	export type Node = PatternNode
}

const implementation: nodeImplementationOf<Pattern.Declaration> =
	implementNode<Pattern.Declaration>({
		kind: "pattern",
		collapsibleKey: "rule",
		keys: {
			rule: {},
			flags: {}
		},
		obviatesBasisDescription: true,
		obviatesBasisExpression: true,
		hasAssociatedError: true,
		intersectionIsOpen: true,
		defaults: {
			description: node => `matched by ${node.rule}`
		}
	})

export class PatternNode extends InternalPrimitiveConstraint<Pattern.Declaration> {
	readonly instance: RegExp = new RegExp(this.rule, this.flags)
	readonly expression: string = `${this.instance}`
	traverseAllows: (string: string) => boolean = this.instance.test.bind(
		this.instance
	)

	readonly compiledCondition: string = `${this.expression}.test(data)`
	readonly compiledNegation: string = `!${this.compiledCondition}`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.string.internal
}

export const Pattern = {
	implementation,
	Node: PatternNode
}
