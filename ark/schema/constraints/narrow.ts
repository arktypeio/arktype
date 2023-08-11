// TODO: allow changed order to be the same type
import type { Orthogonal } from "../type.js"
import { orthogonal } from "../type.js"
import { ConstraintNode } from "./constraint.js"

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowConstraint extends ConstraintNode<Narrow> {
	readonly kind = "narrow"

	writeDefaultDescription() {
		return `valid according to ${this.rule.name}`
	}

	intersectRules(): Orthogonal {
		return orthogonal
	}
}

export type Narrow<data = any> = (data: data) => boolean

export type NarrowCast<data = any, narrowed extends data = data> = (
	data: data
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
	data: any,
	...args: any[]
) => data is infer narrowed
	? narrowed
	: In
