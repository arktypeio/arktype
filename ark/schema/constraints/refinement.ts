import type { listable } from "@arktype/util"
import type { Basis } from "./basis.js"
import type { BoundSchema, MaxNode, MinNode } from "./bounds.js"
import type { DivisorNode, DivisorSchema } from "./divisor.js"
import type { NarrowNode, NarrowSchema } from "./narrow.js"
import type { PatternNode, PatternSchema } from "./pattern.js"
import type { PropNode, PropSchema } from "./prop.js"

export type RefinementClassesByKind = {
	divisor: typeof DivisorNode
	min: typeof MinNode
	max: typeof MaxNode
	pattern: typeof PatternNode
	prop: typeof PropNode
	narrow: typeof NarrowNode
}

export type RefinementsByKind = {
	divisor: DivisorNode
	min: MinNode
	max: MaxNode
	pattern: PatternNode
	prop: PropNode
	narrow: NarrowNode
}

export type RefinementInputsByKind = {
	divisor: DivisorSchema
	min: BoundSchema
	max: BoundSchema
	pattern: PatternSchema
	prop: PropSchema
	narrow: NarrowSchema
}

type hasReducableIntersection<kind extends RefinementKind> =
	null extends ReturnType<Refinement<kind>["intersectSymmetric"]> ? false : true

export type RefinementIntersectionInputsByKind = {
	[k in keyof RefinementInputsByKind]: hasReducableIntersection<k> extends true
		? RefinementInput<k>
		: listable<RefinementInput<k>>
}

export type RefinementKind = keyof RefinementsByKind

export type Refinement<kind extends RefinementKind = RefinementKind> =
	RefinementsByKind[kind]

export type RefinementInput<kind extends RefinementKind = RefinementKind> =
	RefinementInputsByKind[kind]

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export interface BaseRefinement {
	applicableTo(basis: Basis | undefined): basis is Basis | undefined
}
