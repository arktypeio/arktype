import { type extend, type listable, throwParseError } from "@arktype/util"
import {
	BaseNode,
	constraintKinds,
	type IrreducibleConstraintKind
} from "../base.js"
import {
	type DiscriminableSchema,
	type NodeClass,
	type Schema
} from "../nodes.js"
import { type ParseContext } from "../utils.js"
import { type MaxDeclaration, type MinDeclaration } from "./bounds.js"
import { type DivisorDeclaration } from "./divisor.js"
import { type PatternDeclaration } from "./pattern.js"
import { type PredicateDeclaration } from "./predicate.js"
import { type PropDeclarationsByKind } from "./prop.js"

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
	[k in ConstraintKind]: t extends NodeClass<k>["basis"]["infer"] ? k : never
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
	return BaseNode.classesByKind[kind].parse(schema as never, ctx)
}
