import type { BaseSchema } from "../schema.js"
import type { Basis } from "./basis.js"
import type { BoundNode } from "./bound.js"
import { ConstraintNode } from "./constraint.js"
import type { DivisibilityNode } from "./divisor.js"
import type { NarrowNode } from "./narrow.js"
import type { PatternNode } from "./pattern.js"
import type { PropNode } from "./prop.js"

export type RefinementClassesByKind = {
	divisor: typeof DivisibilityNode
	bound: typeof BoundNode
	regex: typeof PatternNode
	prop: typeof PropNode
	narrow: typeof NarrowNode
}

export type RefinementsByKind = {
	divisor: DivisibilityNode
	bound: BoundNode
	regex: PatternNode
	prop: PropNode
	narrow: NarrowNode
}

export type RefinementKind = keyof RefinementsByKind

export type Refinement<kind extends RefinementKind = RefinementKind> =
	RefinementsByKind[kind]

export abstract class RefinementNode<
	schema extends BaseSchema
> extends ConstraintNode<schema> {
	declare infer: unknown

	abstract applicableTo(basis: Basis | undefined): basis is Basis | undefined
}
