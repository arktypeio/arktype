import { type extend, type listable, throwParseError } from "@arktype/util"
import {
	BaseNode,
	constraintKinds,
	type DeclaredTypes,
	type declareNode,
	type IrreducibleConstraintKind,
	type NodeDeclaration,
	type StaticBaseNode
} from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import {
	type DiscriminableSchema,
	type Node,
	type NodeClass,
	type Schema
} from "../nodes.js"
import { type Root } from "../root.js"
import { type MaxDeclaration, type MinDeclaration } from "./bounds.js"
import { type DivisorDeclaration } from "./divisor.js"
import { type PatternDeclaration } from "./pattern.js"
import { type PredicateDeclaration } from "./predicate.js"
import { type PropDeclarations } from "./prop.js"

export type ConstraintDeclarationsByKind = extend<
	PropDeclarations,
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

export type ConstraintContext = {
	basis: Node<BasisKind> | undefined
}

export interface StaticConstraintNode<d extends NodeDeclaration>
	extends StaticBaseNode<d> {
	basis: Root

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined): string
}

export type declareConstraint<
	kind extends ConstraintKind,
	types extends DeclaredTypes<kind>,
	implementation extends StaticConstraintNode<
		declareConstraint<kind, types, implementation>
	>
> = declareNode<kind, types, implementation>

export const parseConstraint = (
	schema: DiscriminableSchema<ConstraintKind>,
	ctx: ConstraintContext
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
