import { describeCollapsibleDate, printDecimal } from "@ark/util"
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
import type { LimitSchemaValue, LimitValue } from "./range.ts"

export declare namespace NotEqual {
	export interface Inner {
		readonly rule: LimitValue
	}

	export interface ExpandedSchema extends BaseNodeInput {
		readonly rule: LimitSchemaValue
	}

	export type Schema = ExpandedSchema | LimitSchemaValue

	export interface ErrorContext extends BaseErrorContext<"notEqual">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "notEqual"
			inner: Inner
			stacks: true
			prerequisite: number | Date
			errorCtx: ErrorContext
		}> {}

	export type Node = NotEqualNode
}

const implementation: nodeImplementationOf<NotEqual.Declaration> =
	implementNode<NotEqual.Declaration>({
		kind: "notEqual",
		bareKey: "rule",
		keys: {
			rule: {
				serialize: rule => (rule instanceof Date ? rule.toISOString() : rule)
			}
		},
		ownErr: true,
		stacks: true,
		defaults: {
			description: node =>
				`other than ${
					node.rule instanceof Date ?
						describeCollapsibleDate(node.rule)
					:	node.rule
				}`
		},
		coversNoun: true
	})

// the negation of a unit, comparing a Date by its time
export class NotEqualNode extends InternalPrimitiveConstraint<NotEqual.Declaration> {
	private readonly isDate = this.rule instanceof Date
	readonly numRule: number = this.rule.valueOf()

	traverseAllows: (data: number | Date) => boolean =
		this.isDate ?
			data => data.valueOf() !== this.numRule
		:	data => data !== this.numRule

	compileCondition(js: NodeCompiler, data: string): string {
		return `${data}${this.isDate ? ".valueOf()" : ""} !== ${this.numRule}`
	}

	readonly implied: BaseRoot = $ark.kw[this.isDate ? "Date" : "number"].internal

	readonly expression: string = `!= ${
		this.isDate ?
			`d'${(this.rule as Date).toISOString()}'`
		:	printDecimal(this.rule as number)
	}`
}

export const NotEqual = {
	impl: implementation,
	Node: NotEqualNode
}
