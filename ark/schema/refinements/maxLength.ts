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

export declare namespace MaxLength {
	export interface Inner extends BaseRangeInner {
		rule: number
		unit?: BoundUnit
	}

	export interface ExpandedSchema extends UnknownExpandedRangeSchema {
		rule: number
		unit?: BoundUnitInput
	}

	export type Schema = ExpandedSchema | number

	export interface ErrorContext extends BaseErrorContext<"maxLength">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "maxLength"
			reducibleTo: "exactLength"
			inner: Inner
			prerequisite: LengthBoundableData
			errorCtx: ErrorContext
		}> {}

	export type Node = MaxLengthNode
}

const implementation: nodeImplementationOf<MaxLength.Declaration> =
	implementNode<MaxLength.Declaration>({
		kind: "maxLength",
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
				`at most ${formatBoundCount(node.rule, node.unit, `length ${node.rule}`)}`
		}
	})

export class MaxLengthNode extends BaseRange<MaxLength.Declaration> {
	readonly implied: BaseRoot = $ark.kw.lengthBoundable.internal

	tAllows(data: LengthBoundableData): boolean {
		return data.length <= this.rule
	}
}

export const MaxLength = {
	impl: implementation,
	Node: MaxLengthNode
}
