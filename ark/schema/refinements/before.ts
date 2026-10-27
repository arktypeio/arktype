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

export declare namespace Before {
	export interface Inner extends BaseRangeInner {
		rule: Date
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: LimitSchemaValue
	}

	export type Schema = ExpandedSchema | LimitSchemaValue

	export interface ErrorContext extends BaseErrorContext<"before">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "before"
			inner: Inner
			prerequisite: Date
			errorCtx: ErrorContext
		}> {}

	export type Node = BeforeNode
}

const implementation: nodeImplementationOf<Before.Declaration> =
	implementNode<Before.Declaration>({
		kind: "before",
		bareKey: "rule",
		ownErr: true,
		keys: {
			rule: {
				serialize: schema => schema.toISOString()
			}
		},
		defaults: {
			description: node => `${describeCollapsibleDate(node.rule)} or earlier`
		}
	})

export class BeforeNode extends BaseRange<Before.Declaration> {
	collapsibleLimitString = describeCollapsibleDate(this.rule)

	traverseAllows(data: Date): boolean {
		return data <= this.rule
	}

	implied: BaseRoot = $ark.kw.Date.internal
}

export const Before = {
	impl: implementation,
	Node: BeforeNode
}
