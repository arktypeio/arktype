import { type extend, type listable } from "@arktype/util"
import { type RuleAttachments } from "../base.ts"
import { type BasisKind } from "../bases/basis.ts"
import { type Node, type Schema } from "../nodes.ts"
import { type IrreducibleConstraintKind } from "../utils.ts"
import {
	type MaxDeclaration,
	MaxImplementation,
	type MinDeclaration,
	MinImplementation
} from "./bounds.ts"
import { type DivisorDeclaration, DivisorImplementation } from "./divisor.ts"
import { type PatternDeclaration, PatternImplementation } from "./pattern.ts"
import {
	type PredicateDeclaration,
	PredicateImplementation
} from "./predicate.ts"
import {
	OptionalImplementation,
	type PropDeclarationsByKind,
	RequiredImplementation
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
