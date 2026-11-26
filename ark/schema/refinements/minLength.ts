import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	BaseRange,
	formatBoundCount,
	type BaseRangeInner,
	type BoundUnit,
	type BoundUnitInput,
	type LengthBoundableData,
	type UnknownExpandedRangeSchema
} from "./range.ts"

export declare namespace MinLength {
	export interface Inner extends BaseRangeInner {
		rule: number
		unit?: BoundUnit
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: number
		unit?: BoundUnitInput
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext extends BaseErrorContext<"minLength">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "minLength"
			inner: Inner
			prerequisite: LengthBoundableData
			reducibleTo: "intersection"
			errorCtx: ErrorContext
		}> {}

	export type Node = MinLengthNode
}

const implementation: nodeImplementationOf<MinLength.Declaration> =
	implementNode<MinLength.Declaration>({
		kind: "minLength",
		bareKey: "rule",
		ownErr: true,
		keys: {
			rule: {},
			unit: {
				unserialized: true
			}
		},
		defaults: {
			description: node =>
				node.rule === 1 ?
					"non-empty"
				:	`at least ${formatBoundCount(node.rule, node.unit, `length ${node.rule}`)}`
		}
	})

export class MinLengthNode extends BaseRange<MinLength.Declaration> {
	readonly implied: BaseRoot = $ark.kw.lengthBoundable.internal

	tAllows(data: LengthBoundableData): boolean {
		return data.length >= this.rule
	}
}

export const MinLength = {
	impl: implementation,
	Node: MinLengthNode
}
