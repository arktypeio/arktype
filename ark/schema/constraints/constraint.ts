import { type extend, type listable } from "@arktype/util"
import {
	type IrreducibleConstraintKind,
	type RuleAttachments
} from "../base.ts"
import { type BasisKind } from "../bases/basis.ts"
import { type Node, type Schema } from "../nodes.ts"
import {
	type MaxDeclaration,
	type MaxImplementation,
	type MinDeclaration,
	type MinImplementation
} from "./bounds.ts"
import {
	type DivisorDeclaration,
	type DivisorImplementation
} from "./divisor.ts"
import {
	type PatternDeclaration,
	type PatternImplementation
} from "./pattern.ts"
import {
	type PredicateDeclaration,
	type PredicateImplementation
} from "./predicate.ts"
import {
	type PropDeclarationsByKind,
	type PropImplementationByKind
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

export type ConstraintImplementationByKind = extend<
	PropImplementationByKind,
	{
		divisor: typeof DivisorImplementation
		min: typeof MinImplementation
		max: typeof MaxImplementation
		pattern: typeof PatternImplementation
		predicate: typeof PredicateImplementation
	}
>

export type ConstraintAttachments<implicitBasisType> = extend<
	RuleAttachments,
	{
		readonly implicitBasis: Node<BasisKind, implicitBasisType> | undefined
	}
>

export type ConstraintKind = keyof ConstraintDeclarationsByKind

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
