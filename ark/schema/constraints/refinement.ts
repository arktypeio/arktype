import type { listable } from "@arktype/util"
import type { IrreducibleRefinementKind, Node, Schema } from "../node.js"
import type { BasisKind } from "./basis.js"
import { MaxNode, MinNode } from "./bounds.js"
import { DivisorNode } from "./divisor.js"
import { PatternNode } from "./pattern.js"
import { PredicateNode } from "./predicate.js"
import { PropNode } from "./prop.js"

export const refinementClassesByKind = {
	divisor: DivisorNode,
	min: MinNode,
	max: MaxNode,
	pattern: PatternNode,
	prop: PropNode,
	predicate: PredicateNode
}

export type RefinementClassesByKind = typeof refinementClassesByKind

export type RefinementKind = keyof RefinementClassesByKind

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: k extends IrreducibleRefinementKind
		? Schema<k>
		: listable<Schema<k>>
}

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export interface BaseRefinement {
	applicableTo(
		basis: Node<BasisKind> | undefined
	): basis is Node<BasisKind> | undefined

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined): string
}
