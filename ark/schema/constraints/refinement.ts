import type { BaseSchema } from "../schema.js"
import type { Basis } from "./basis.js"
import type { BoundInput, MaxNode, MinNode } from "./bound.js"
import { ConstraintNode } from "./constraint.js"
import type { DivisibilityInput, DivisibilityNode } from "./divisor.js"
import type { NarrowInput, NarrowNode } from "./narrow.js"
import type { PatternInput, PatternNode } from "./pattern.js"
import type { PropInput, PropNode } from "./prop.js"

export type RefinementClassesByKind = {
	divisor: typeof DivisibilityNode
	min: typeof MinNode
	max: typeof MaxNode
	regex: typeof PatternNode
	prop: typeof PropNode
	narrow: typeof NarrowNode
}

export type RefinementsByKind = {
	divisor: DivisibilityNode
	min: MinNode
	max: MaxNode
	regex: PatternNode
	prop: PropNode
	narrow: NarrowNode
}

export type RefinementInputsByKind = {
	divisor: DivisibilityInput
	min: BoundInput
	max: BoundInput
	regex: PatternInput
	prop: PropInput
	narrow: NarrowInput
}

export type RefinementKind = keyof RefinementsByKind

export type Refinement<kind extends RefinementKind = RefinementKind> =
	RefinementsByKind[kind]

export type RefinementInput<kind extends RefinementKind = RefinementKind> =
	RefinementInputsByKind[kind]

export abstract class RefinementNode<
	schema extends BaseSchema
> extends ConstraintNode<schema> {
	declare infer: unknown

	abstract applicableTo(basis: Basis | undefined): basis is Basis | undefined
}
