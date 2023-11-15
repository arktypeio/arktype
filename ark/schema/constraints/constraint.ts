import { includes, type extend, type listable } from "@arktype/util"
import { type BasisKind } from "../bases/basis.ts"
import { Node, Schema } from "../shared/node.ts"
import { RuleAttachments } from "../shared/rule.ts"
import {
	MaxImplementation,
	MinImplementation,
	type MaxDeclaration,
	type MinDeclaration
} from "./bounds.ts"
import { DivisorImplementation, type DivisorDeclaration } from "./divisor.ts"
import { PatternImplementation, type PatternDeclaration } from "./pattern.ts"
import {
	PredicateImplementation,
	type PredicateDeclaration
} from "./predicate.ts"
import {
	OptionalImplementation,
	RequiredImplementation,
	type PropDeclarationsByKind
} from "./prop.ts"

export type ConstraintDeclarationsByKind = extend<
	PropDeclarationsByKind,
	{
		divisor: DivisorDeclaration
		min: MinDeclaration
		max: MaxDeclaration
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export const ConstraintImplementationByKind = {
	divisor: DivisorImplementation,
	min: MinImplementation,
	max: MaxImplementation,
	pattern: PatternImplementation,
	predicate: PredicateImplementation,
	required: RequiredImplementation,
	optional: OptionalImplementation
}

export type ConstraintKind = keyof ConstraintDeclarationsByKind

export const constraintKinds = [
	"divisor",
	"max",
	"min",
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export const irreducibleConstraintKinds = [
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export type IrreducibleConstraintKind = keyof typeof irreducibleConstraintKinds

export type ReducibleConstraintKind = Exclude<
	ConstraintKind,
	IrreducibleConstraintKind
>

// TODO: needed? specify this way?
export const reducibleConstraintKinds = constraintKinds.filter(
	(k): k is ReducibleConstraintKind => !includes(irreducibleConstraintKinds, k)
)

export type ConstraintAttachments<implicitBasisType> = extend<
	RuleAttachments,
	{
		readonly implicitBasis: Node<BasisKind, implicitBasisType> | undefined
	}
>

export type ConstraintIntersectionInputsByKind = {
	[k in ConstraintKind]: k extends IrreducibleConstraintKind
		? Schema<k>
		: listable<Schema<k>>
}

export type ConstraintIntersectionInput<
	kind extends ConstraintKind = ConstraintKind
> = ConstraintIntersectionInputsByKind[kind]

export type constraintKindOf<t> = {
	[k in ConstraintKind]: Node<k> extends {
		implicitBasis: infer basis
	}
		? basis extends Node<BasisKind>
			? t extends basis["infer"]
				? k
				: never
			: basis extends undefined
			? k
			: never
		: never
}[ConstraintKind]

export type constraintInputsByKind<t> = {
	[k in constraintKindOf<t>]?: ConstraintIntersectionInput<k>
}
