import type { errorContext, nodeOfKind } from "../kinds.ts"
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
import { composing, isResolutionFinal } from "../shared/utils.ts"
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
			errorContext: ErrorContext
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
	| errorContext<"domain">
	| errorContext<"unit">
	| errorContext<"proto">
	// a morph whose input has a description: the input's meta
	| { readonly code: "morph"; readonly meta: ArkEnv.meta }

const implementation: nodeImplementationOf<Required.Declaration> =
	implementNode<Required.Declaration>({
		kind: "required",
		ownsError: true,
		openIntersection: true,
		keys: {
			key: {},
			value: {
				child: true,
				structural: true
			}
		},
		defaults: {
			description: node => `${node.compiledKey}: ${node.value.description}`
		}
	})

export class RequiredNode extends BaseProp<"required"> {
	get expression(): string {
		return (this.cache.expression ??= composing(
			() => `${this.compiledKey}: ${this.value.expression}`
		))
	}

	private _errorContext: NodeErrorContextInput<"required"> | undefined
	get errorContext(): NodeErrorContextInput<"required"> {
		return (this._errorContext ??= Object.freeze({
			code: "required",
			missingValueDescription: this.value.defaultBrief,
			missing: missingValueOf(this.value),
			valueMeta: this.value.meta,
			meta: this.meta
		}))
	}

	// a basis value shares the key's site, as a missing key fails it too
	override get failureSite(): FailureSite {
		return (this.cache.failureSite ??=
			this.value.isBasis() ?
				{ v: this.value.errorContext, m: this.errorContext }
			:	{ m: this.errorContext }) as FailureSite
	}
}

export const Required = {
	implementation,
	Node: RequiredNode
}

const unknownValue: MissingValue = Object.freeze({ code: "intersection" })

// the walk of defaultBrief, keeping each basis's context
const missingValueOf = (value: BaseRoot): MissingValue => {
	if (value.hasKind("union")) {
		return Object.freeze({
			code: "union",
			branches: Object.freeze(value.branches.map(missingValueOf))
		})
	}
	if (value.hasKind("intersection"))
		return value.basis ? missingValueOf(value.basis) : unknownValue
	if (value.hasKind("morph")) {
		return value.rawIn.meta.description === undefined ?
				missingValueOf(value.rawIn)
			:	Object.freeze({ code: "morph", meta: value.rawIn.meta })
	}
	if (value.hasKind("alias")) {
		return missingValueOf(
			isResolutionFinal() ? value.resolution : $ark.intrinsic.object
		)
	}
	if (value.hasKind("unit") && value.domain === "object")
		return missingValueOf($ark.intrinsic.object)
	return Object.freeze((value as nodeOfKind<BasisKind>).errorContext)
}
