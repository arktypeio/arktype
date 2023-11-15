import type { extend } from "@arktype/util"
import {
	type BasisDeclarationsByKind,
	BasisImplementationByKind,
	basisKinds
} from "../bases/basis.ts"
import {
	type ConstraintDeclarationsByKind,
	ConstraintImplementationByKind,
	constraintKinds
} from "../constraints/constraint.ts"

export type RuleDeclarationsByKind = extend<
	BasisDeclarationsByKind,
	ConstraintDeclarationsByKind
>

export const RuleImplementationByKind = {
	...BasisImplementationByKind,
	...ConstraintImplementationByKind
}

export type RuleKind = keyof RuleDeclarationsByKind

export const ruleKinds = [
	...basisKinds,
	...constraintKinds
] as const satisfies readonly RuleKind[]

export type RuleAttachments = {
	readonly condition: string
}
