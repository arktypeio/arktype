import type { listable } from "@arktype/util"
import type { Node, Schema } from "../node.js"
import type { BasisKind } from "./basis.js"
import type { MaxNode, MinNode } from "./bounds.js"
import type { DivisorNode } from "./divisor.js"
import type { PatternNode } from "./pattern.js"
import type { PredicateNode } from "./predicate.js"
import type { PropNode } from "./prop.js"

export type RefinementClassesByKind = {
	divisor: typeof DivisorNode
	min: typeof MinNode
	max: typeof MaxNode
	pattern: typeof PatternNode
	prop: typeof PropNode
	predicate: typeof PredicateNode
}

export type RefinementKind = keyof RefinementClassesByKind

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
}
