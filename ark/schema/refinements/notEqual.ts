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
			openIntersection: true
			prerequisite: number | Date
			errorContext: ErrorContext
		}> {}

	export type Node = NotEqualNode
}

const implementation: nodeImplementationOf<NotEqual.Declaration> =
	implementNode<NotEqual.Declaration>({
		kind: "notEqual",
		collapseKey: "rule",
		keys: {
			rule: {
				serialize: rule => (rule instanceof Date ? rule.toISOString() : rule)
			}
		},
		ownsError: true,
		openIntersection: true,
		defaults: {
			description: node =>
				`other than ${
					node.rule instanceof Date ?
						describeCollapsibleDate(node.rule)
					:	node.rule
				}`
		},
		coversBasisNoun: true
	})

// the negation of a unit, comparing a Date by its time
export class NotEqualNode extends InternalPrimitiveConstraint<NotEqual.Declaration> {
	private readonly isDate = this.rule instanceof Date
	readonly numericLimit: number = this.rule.valueOf()

	traverseAllows: (data: number | Date) => boolean =
		this.isDate ?
			data => data.valueOf() !== this.numericLimit
		:	data => data !== this.numericLimit

	compileCondition(js: NodeCompiler, data: string): string {
		return `${data}${this.isDate ? ".valueOf()" : ""} !== ${this.numericLimit}`
	}

	readonly impliedBasis: BaseRoot =
		$ark.intrinsic[this.isDate ? "Date" : "number"].internal

	readonly expression: string = `!= ${
		this.isDate ?
			`d'${(this.rule as Date).toISOString()}'`
		:	printDecimal(this.rule as number)
	}`
}

export const NotEqual = {
	implementation,
	Node: NotEqualNode
}
