import type { Disjoint } from "../disjoint.js"
import type { BaseSchema } from "../schema.js"
import { BaseNode } from "../schema.js"
import type { BoundNode } from "./bound.js"
import type { DivisibilityNode } from "./divisor.js"
import type { NarrowNode } from "./narrow.js"
import type { PatternNode } from "./pattern.js"
import type { PropNode } from "./prop.js"

export type ConstraintClassesByKind = {
	divisor: typeof DivisibilityNode
	bound: typeof BoundNode
	regex: typeof PatternNode
	prop: typeof PropNode
	narrow: typeof NarrowNode
}

export type ConstraintsByKind = {
	divisor: DivisibilityNode
	bound: BoundNode
	regex: PatternNode
	prop: PropNode
	narrow: NarrowNode
}

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export abstract class ConstraintNode<
	schema extends BaseSchema
> extends BaseNode<schema> {
	declare infer: unknown

	reduce(other: Constraint): Constraint | Disjoint | null {
		return this as never
	}

	// TODO: only own keys
	abstract reduceWith(other: Constraint): schema | null | Disjoint

	abstract applicableTo(basis: Basis | undefined): basis is Basis | undefined
}
