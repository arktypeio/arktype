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

export type RefinementDeclarationsByKind = extend<
	PropDeclarations,
	{
		divisor: DivisorDeclaration
		min: MinDeclaration
		max: MaxDeclaration
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export type RefinementKind = keyof RefinementDeclarationsByKind

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: k extends IrreducibleRefinementKind
		? Schema<k>
		: listable<Schema<k>>
}

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export type RefinementContext = {
	basis: Node<BasisKind> | undefined
}

export interface StaticRefinementNode<d extends NodeDeclaration>
	extends StaticBaseNode<d> {
	basis: Root

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined): string
}

export type declareRefinement<
	kind extends RefinementKind,
	types extends NodeTypes<kind>,
	implementation extends StaticRefinementNode<
		declareRefinement<kind, types, implementation>
	>
> = declareNode<kind, types, implementation>
