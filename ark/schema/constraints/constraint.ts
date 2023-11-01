import type { extend, listable } from "@arktype/util"
import type {
	declareNode,
	IrreducibleRefinementKind,
	NodeDeclaration,
	NodeTypes,
	StaticBaseNode
} from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import { type Node, type Schema } from "../nodes.js"
import { type Root, type RootNode } from "../root.js"
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
	[k in ConstraintKind]: k extends IrreducibleRefinementKind
		? Schema<k>
		: listable<Schema<k>>
}

export type ConstraintIntersectionInput<
	kind extends ConstraintKind = ConstraintKind
> = ConstraintIntersectionInputsByKind[kind]

export type ConstraintContext = {
	basis: Node<BasisKind> | undefined
}

export interface StaticConstraintNode<d extends NodeDeclaration>
	extends StaticBaseNode<d> {
	basis: Root
}

export type declareConstraint<
	kind extends ConstraintKind,
	types extends NodeTypes<kind>,
	implementation extends StaticConstraintNode<
		declareConstraint<kind, types, implementation>
	>
> = declareNode<kind, types, implementation>
