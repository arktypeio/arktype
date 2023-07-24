import type { ConstraintDefinition } from "./constraint.js"
import { Constraint, ConstraintSet } from "./constraint.js"

export interface NarrowConstraint extends ConstraintDefinition {
	readonly narrow: Narrow
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

export class NarrowNode extends ConstraintNode<NarrowConstraint> {
	readonly kind = "divisor"

	readonly defaultDescription = `valid according to ${this.narrow.name}`
}

// intersect: (l, r) =>
//     // as long as the narrows in l and r are individually safe to check
//     // in the order they're specified, checking them in the order
//     // resulting from this intersection should also be safe.
//     intersectUniqueLists(l.children, r.children)

// TODO: allow changed order to be the same type

export class NarrowSet extends ConstraintSet<readonly NarrowNode[], NarrowSet> {
	intersect(other: NarrowSet) {
		return this
	}
}

export type NarrowIntersection = readonly NarrowNode[]
