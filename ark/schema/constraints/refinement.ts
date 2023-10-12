import type { listable } from "@arktype/util"
import type { Node } from "../node.js"
import type { Basis } from "./basis.js"
import type { BoundSchema, MaxNode, MinNode } from "./bounds.js"
import type { DivisorNode, DivisorSchema } from "./divisor.js"
import type { PatternNode, PatternSchema } from "./pattern.js"
import type { PredicateNode, PredicateSchema } from "./predicate.js"
import type { PropNode, PropSchema } from "./prop.js"

export type RefinementClassesByKind = {
	divisor: typeof DivisorNode
	min: typeof MinNode
	max: typeof MaxNode
	pattern: typeof PatternNode
	prop: typeof PropNode
	predicate: typeof PredicateNode
}

type hasReducableIntersection<kind extends RefinementKind> =
	null extends ReturnType<Node<kind>["intersectSymmetric"]> ? false : true

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: hasReducableIntersection<k> extends true
		? RefinementInput<k>
		: listable<RefinementInput<k>>
}

export type RefinementKind = keyof RefinementClassesByKind

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export interface BaseRefinement {
	applicableTo(basis: Basis | undefined): basis is Basis | undefined
}
