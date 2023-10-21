import type { listable } from "@arktype/util"
import type { Node, Schema } from "../node.js"
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

export type IrreducibleRefinementKind = {
	[k in RefinementKind]: hasReducableIntersection<k> extends false ? k : never
}[RefinementKind]

export const irreducibleRefinementKinds = {
	pattern: 1,
	predicate: 1,
	prop: 1
} as const satisfies Record<IrreducibleRefinementKind, 1>

type hasReducableIntersection<kind extends RefinementKind> =
	null extends ReturnType<Node<kind>["intersectSymmetric"]> ? false : true

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: hasReducableIntersection<k> extends true
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
