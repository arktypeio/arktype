import type { extend, listable } from "@arktype/util"
import type { IrreducibleRefinementKind } from "../base.js"
import { type Node, type Schema } from "../node.js"
import type { BasisKind } from "./basis.js"
import {
	type MaxDeclaration,
	MaxNode,
	type MinDeclaration,
	MinNode
} from "./bounds.js"
import { type DivisorDeclaration, DivisorNode } from "./divisor.js"
import { type PatternDeclaration, PatternNode } from "./pattern.js"
import { type PredicateDeclaration, PredicateNode } from "./predicate.js"
import { OptionalNode, type PropDeclarations, RequiredNode } from "./prop.js"

export const refinementClassesByKind = {
	divisor: DivisorNode,
	min: MinNode,
	max: MaxNode,
	pattern: PatternNode,
	required: RequiredNode,
	optional: OptionalNode,
	predicate: PredicateNode
}

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

export type BaseRefinement = {
	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is Node<BasisKind> | undefined

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined): string
}
