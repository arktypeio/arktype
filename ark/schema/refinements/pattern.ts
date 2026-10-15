import { BaseConstraint } from "../constraint.ts"
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
import type { InternalTraversal } from "../shared/traversal.ts"

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

export class PatternNode extends BaseConstraint<Pattern.Declaration> {
	readonly instance: RegExp = new RegExp(this.rule, this.flags)
	readonly expression: string = `${this.instance}`
	// g and y make test start from lastIndex, which it also advances
	private readonly resetsLastIndex =
		this.instance.global || this.instance.sticky

	traverseAllows: (string: string) => boolean =
		this.resetsLastIndex ?
			string => {
				this.instance.lastIndex = 0
				return this.instance.test(string)
			}
		:	this.instance.test.bind(this.instance)

	traverseApply(data: string, ctx: InternalTraversal): void {
		if (!this.traverseAllows(data))
			ctx.errorFromNodeContext(this.errorContext, data)
	}

	private _errorContext: Pattern.ErrorContext | undefined
	get errorContext(): Pattern.ErrorContext {
		return (this._errorContext ??= {
			code: "pattern",
			description: this.description,
			meta: this.meta,
			...this.inner
		})
	}

	// a ref rather than a literal, so a pattern the engine rejects fails its own definition
	compileCondition(js: NodeCompiler, data: string): string {
		const instance = js.ref(this.instance)
		return this.resetsLastIndex ?
				`(${instance}.lastIndex = 0, ${instance}.test(${data}))`
			:	`${instance}.test(${data})`
	}

	compile(js: NodeCompiler): void {
		js.checkLeaf(this)
	}

	readonly impliedBasis: BaseRoot = $ark.intrinsic.string.internal
}

export const Pattern = {
	implementation,
	Node: PatternNode
}
