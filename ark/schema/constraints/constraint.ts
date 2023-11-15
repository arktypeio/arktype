import type { extend, listable } from "@arktype/util"
import type { BasisKind } from "../bases/basis.ts"
import type { Node, Schema } from "../shared/node.ts"
import type { RuleAttachments } from "../shared/rule.ts"
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
	type OptionalDeclaration,
	type RequiredDeclaration
} from "./prop.ts"

export type ClosedConstraintDeclarations = {
	divisor: DivisorDeclaration
	min: MinDeclaration
	max: MaxDeclaration
}

export type ClosedConstraintKind = keyof ClosedConstraintDeclarations

export type OpenConstraintDeclarations = {
	pattern: PatternDeclaration
	predicate: PredicateDeclaration
	required: RequiredDeclaration
	optional: OptionalDeclaration
}

export type OpenConstraintKind = keyof OpenConstraintDeclarations

export type ConstraintDeclarations = extend<
	ClosedConstraintDeclarations,
	OpenConstraintDeclarations
>

export type ConstraintKind = keyof ConstraintDeclarations

export const ConstraintImplementations = {
	divisor: DivisorImplementation,
	min: MinImplementation,
	max: MaxImplementation,
	pattern: PatternImplementation,
	predicate: PredicateImplementation,
	required: RequiredImplementation,
	optional: OptionalImplementation
} as const satisfies Record<ConstraintKind, unknown>

export type ConstraintAttachments<implicitBasisType> = extend<
	RuleAttachments,
	{
		readonly implicitBasis: Node<BasisKind, implicitBasisType> | undefined
	}
>

export type ConstraintIntersectionInputsByKind = {
	[k in ConstraintKind]: k extends OpenConstraintKind
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
