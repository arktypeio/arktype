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
	type MaxNode,
	type MinDeclaration,
	type MinNode
} from "./bounds.js"
import { type DivisorDeclaration, type DivisorNode } from "./divisor.js"
import { type PatternDeclaration, type PatternNode } from "./pattern.js"
import { type PredicateDeclaration, type PredicateNode } from "./predicate.js"
import { type PropClassesByKind, type PropDeclarationsByKind } from "./prop.js"

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

export type ConstraintClassesByKind = extend<
	PropClassesByKind,
	{
		divisor: typeof DivisorNode
		min: typeof MinNode
		max: typeof MaxNode
		pattern: typeof PatternNode
		predicate: typeof PredicateNode
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
	return new BaseNode.classesByKind[kind](schema as never, ctx)
}
