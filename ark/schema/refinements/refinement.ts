import type { extend, listable } from "@arktype/util"
import type { BasisKind } from "../bases/basis.js"
import type {
	ConstraintAttachments,
	OpenRefinementKind,
	RefinementKind
} from "../shared/define.js"
import type { Node, Schema } from "../shared/node.js"
import {
	MaxImplementation,
	MinImplementation,
	type MaxDeclaration,
	type MinDeclaration
} from "./bounds.js"
import { DivisorImplementation, type DivisorDeclaration } from "./divisor.js"
import { PatternImplementation, type PatternDeclaration } from "./pattern.js"
import {
	PredicateImplementation,
	type PredicateDeclaration
} from "./predicate.js"
import { PropImplementations, type PropDeclarations } from "./props/prop.js"

export type ClosedRefinementDeclarations = {
	divisor: DivisorDeclaration
	min: MinDeclaration
	max: MaxDeclaration
}

export type OpenRefinementDeclarations = extend<
	PropDeclarations,
	{
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export type RefinementDeclarations = extend<
	ClosedRefinementDeclarations,
	OpenRefinementDeclarations
>

export const RefinementImplementations = {
	divisor: DivisorImplementation,
	min: MinImplementation,
	max: MaxImplementation,
	pattern: PatternImplementation,
	predicate: PredicateImplementation,
	...PropImplementations
} as const satisfies Record<RefinementKind, unknown>

export type RefinementAttachments<implicitBasisType> = extend<
	ConstraintAttachments,
	{
		readonly implicitBasis: Node<BasisKind, implicitBasisType> | undefined
	}
>

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: k extends OpenRefinementKind
		? listable<Schema<k>>
		: Schema<k>
}

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export type refinementKindOf<t> = {
	[k in RefinementKind]: Node<k> extends {
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
}[RefinementKind]

export type refinementInputsByKind<t> = {
	[k in refinementKindOf<t>]?: RefinementIntersectionInput<k>
}
