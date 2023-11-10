import { type extend, type listable, throwParseError } from "@arktype/util"
import {
	BaseNode,
	constraintKinds,
	type IrreducibleConstraintKind
} from "../base.js"
import { type BasisKind } from "../bases/basis.js"
import { type DiscriminableSchema, type Node, type Schema } from "../nodes.js"
import { type ParseContext } from "../utils.js"
import {
	type MaxDeclaration,
	type MaxImplementation,
	type MinDeclaration,
	type MinImplementation
} from "./bounds.js"
import {
	type DivisorDeclaration,
	type DivisorImplementation
} from "./divisor.js"
import {
	type PatternDeclaration,
	type PatternImplementation
} from "./pattern.js"
import {
	type PredicateDeclaration,
	type PredicateImplementation
} from "./predicate.js"
import {
	type PropDeclarationsByKind,
	type PropImplementationByKind
} from "./prop.js"

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

export type discriminableConstraintSchema<t> = DiscriminableSchema<
	constraintKindOf<t>
>

export const parseConstraint = (
	schema: DiscriminableSchema<ConstraintKind>,
	ctx: ParseContext
) => {
	const kind = constraintKinds.find((kind) => kind in schema)
	if (!kind) {
		return throwParseError(
			`Constraint schema must contain one of the following keys: ${constraintKinds.join(
				", "
			)}`
		)
	}
	return new BaseNode(schema as never, ctx)
}
