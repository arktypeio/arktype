import type { errorCtx, nodeOfKind } from "../kinds.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import type { NodeErrorContextInput } from "../shared/errors.ts"
import type { FailureSite } from "../shared/issues.ts"
import {
	implementNode,
	type BasisKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import { composing, elided, isResolutionFinal } from "../shared/utils.ts"
import { BaseProp, type Prop } from "./prop.ts"

export declare namespace Required {
	export interface ErrorContext extends BaseErrorContext<"required"> {
		readonly missingValueDescription: string
		readonly missing: MissingValue
		readonly valueMeta: ArkEnv.meta
	}

	export interface Inner extends Prop.Inner {}

	export type Declaration = declareNode<
		Prop.Declaration<"required"> & {
			inner: Inner
			errorCtx: ErrorContext
		}
	>

	export type Node = RequiredNode
}

/** what a missing value should have been; each entry has its node's kind */
export type MissingValue =
	| MissingBasis
	// a value with no basis, such as unknown: "present" in English
	| { readonly code: "intersection" }
	// branches in order; none is never
	| { readonly code: "union"; readonly branches: readonly MissingValue[] }

export type MissingBasis =
	| errorCtx<"domain">
	| errorCtx<"unit">
	| errorCtx<"proto">
	// a morph whose input has a description: the input's meta
	| { readonly code: "morph"; readonly meta: ArkEnv.meta }

const implementation: nodeImplementationOf<Required.Declaration> =
	implementNode<Required.Declaration>({
		kind: "required",
		ownErr: true,
		stacks: true,
		keys: {
			key: {},
			value: {
				child: true,
				structural: true
			}
		},
		defaults: {
			description: node => `${node.keyStr}: ${elided(node.value.description)}`
		}
	})

export class RequiredNode extends BaseProp<"required"> {
	get expression(): string {
		return (this.cache.expression ??= composing(
			() => `${this.keyStr}: ${elided(this.value.expression)}`
		))
	}

	private _errorCtx: NodeErrorContextInput<"required"> | undefined
	get errorCtx(): NodeErrorContextInput<"required"> {
		return (this._errorCtx ??= Object.freeze({
			code: "required",
			missingValueDescription: this.value.brief,
			missing: missingValueOf(this.value),
			valueMeta: this.value.meta,
			meta: this.meta
		}))
	}

	// a basis value shares the key's site, as a missing key fails it too
	override get failSite(): FailureSite {
		return (this.cache.failSite ??=
			this.value.isBasis() ?
				{ v: this.value.errorCtx, m: this.errorCtx }
			:	{ m: this.errorCtx }) as FailureSite
	}
}

export const Required = {
	impl: implementation,
	Node: RequiredNode
}

const unknownValue: MissingValue = Object.freeze({ code: "intersection" })

// the walk of brief, keeping each basis's context
const missingValueOf = (value: BaseRoot): MissingValue => {
	if (value.is("union")) {
		return Object.freeze({
			code: "union",
			branches: Object.freeze(value.branches.map(missingValueOf))
		})
	}
	if (value.is("intersection"))
		return value.basis ? missingValueOf(value.basis) : unknownValue
	if (value.is("morph")) {
		return value._in.meta.description === undefined ?
				missingValueOf(value._in)
			:	Object.freeze({ code: "morph", meta: value._in.meta })
	}
	if (value.is("alias")) {
		return missingValueOf(
			isResolutionFinal() ? value.resolution : $ark.intrinsic.object
		)
	}
	if (value.is("unit") && value.domain === "object")
		return missingValueOf($ark.intrinsic.object)
	return Object.freeze((value as nodeOfKind<BasisKind>).errorCtx)
}
