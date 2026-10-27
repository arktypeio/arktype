import { describeCollapsibleDate } from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	BaseRange,
	type BaseRangeInner,
	type LimitSchemaValue,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace After {
	export interface Inner extends BaseRangeInner {
		rule: Date
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: LimitSchemaValue
	}

	export type Schema = ExpandedSchema | LimitSchemaValue

	export interface ErrorContext extends BaseErrorContext<"after">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "after"
			inner: Inner
			prerequisite: Date
			errorCtx: ErrorContext
		}> {}

	export type Node = AfterNode
}

const implementation: nodeImplementationOf<After.Declaration> =
	implementNode<After.Declaration>({
		kind: "after",
		bareKey: "rule",
		ownErr: true,
		keys: {
			rule: {
				serialize: schema => schema.toISOString()
			}
		},
		defaults: {
			description: node => `${describeCollapsibleDate(node.rule)} or later`
		}
	})

export class AfterNode extends BaseRange<After.Declaration> {
	implied: BaseRoot = $ark.kw.Date.internal

	collapsibleLimitString = describeCollapsibleDate(this.rule)

	traverseAllows(data: Date): boolean {
		return data >= this.rule
	}
}

export const After = {
	impl: implementation,
	Node: AfterNode
}
