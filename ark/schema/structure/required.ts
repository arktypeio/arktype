import type { errorCtx, nodeOfKind } from "../kinds.ts"
import type { BaseRoot } from "../roots/root.ts"
import { metaLabeledAlike } from "../roots/union.ts"
import type {
	ArkEnv,
	BaseErrorContext,
	declareNode
} from "../shared/declare.ts"
import type { NodeErrorContextInput } from "../shared/errors.ts"
import type { FailureSite } from "../shared/issues.ts"
import {
	implementNode,
	type BasisKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	authoredDescriptionOf,
	composing,
	describeBranches,
	elided,
	isResolutionFinal
} from "../shared/utils.ts"
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
	| { readonly code: "intersection"; readonly meta?: ArkEnv.meta }
	// branches in order; none is never
	| {
			readonly code: "union"
			readonly branches: readonly MissingValue[]
			readonly meta?: ArkEnv.meta
	  }

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
		return (this.c.expression ??= composing(
			() => `${this.keyStr}: ${elided(this.value.expression)}`
		))
	}

	private _errorCtx: NodeErrorContextInput<"required"> | undefined
	get errorCtx(): NodeErrorContextInput<"required"> {
		return (this._errorCtx ??= Object.freeze({
			code: "required",
			missingValueDescription: missingDescriptionOf(this.value),
			missing: missingValueOf(this.value),
			// a missing union is named as its branches are when it's present
			valueMeta:
				this.value.is("union") ?
					metaLabeledAlike(this.value.meta, this.value.branches)
				:	this.value.meta,
			meta: this.meta
		}))
	}

	// a basis value shares the key's site, as a missing key fails it too
	override get failSite(): FailureSite {
		return (this.c.failSite ??=
			this.value.isBasis() ?
				{
					v: this.value.errorCtx,
					m: this.errorCtx,
					vb: undefined,
					mb: undefined
				}
			:	{ m: this.errorCtx, vb: undefined, mb: undefined }) as FailureSite
	}
}

export const Required = {
	impl: implementation,
	Node: RequiredNode
}

const unknownValue: MissingValue = Object.freeze({ code: "intersection" })

// what a missing required property expects in English: a user-authored
// description on the value (or its branches) before falling back to brief
const missingDescriptionOf = (value: BaseRoot): string => {
	const authored = authoredDescriptionOf(value.meta)
	if (authored !== undefined) return authored
	if (value.is("union"))
		return value.distribute(missingDescriptionOf, describeBranches)
	if (value.is("intersection"))
		return value.basis ? missingDescriptionOf(value.basis) : "present"
	if (value.is("morph")) {
		return (
				value._in.meta.description !== undefined &&
					value._in.meta.expected === undefined
			) ?
				value._in.meta.description
			:	missingDescriptionOf(value._in)
	}
	if (value.is("alias")) {
		return isResolutionFinal() ?
				missingDescriptionOf(value.resolution)
			:	"an object"
	}
	return value.brief
}

// the walk of brief, keeping each basis's context and any authored description
const missingValueOf = (value: BaseRoot): MissingValue => {
	const authored = authoredDescriptionOf(value.meta)
	if (value.is("union")) {
		const branches = Object.freeze(value.branches.map(missingValueOf))
		return Object.freeze(
			authored !== undefined ?
				{ code: "union", branches, meta: value.meta }
			:	{ code: "union", branches }
		)
	}
	if (value.is("intersection")) {
		if (authored !== undefined)
			return Object.freeze({ code: "intersection", meta: value.meta })
		return value.basis ? missingValueOf(value.basis) : unknownValue
	}
	if (value.is("morph")) {
		if (authored !== undefined)
			return Object.freeze({ code: "morph", meta: value.meta })
		return (
				value._in.meta.description === undefined ||
					value._in.meta.expected !== undefined
			) ?
				missingValueOf(value._in)
			:	Object.freeze({ code: "morph", meta: value._in.meta })
	}
	if (value.is("alias")) {
		if (authored !== undefined)
			return Object.freeze({ code: "intersection", meta: value.meta })
		return missingValueOf(
			isResolutionFinal() ? value.resolution : $ark.kw.object
		)
	}
	if (value.is("unit") && value.domain === "object" && authored === undefined)
		return missingValueOf($ark.kw.object)
	return Object.freeze((value as nodeOfKind<BasisKind>).errorCtx)
}
