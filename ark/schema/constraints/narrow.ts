// TODO: allow changed order to be the same type
import { isArray } from "@arktype/util"
import type { Orthogonal } from "../type.js"
import { BaseNode, orthogonal } from "../type.js"
import { ConstraintSet } from "./constraint.js"

export type NarrowRule = Narrow | readonly NarrowConstraint<Narrow>[]

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowConstraint<
	rule extends NarrowRule = NarrowRule
> extends ConstraintSet<{
	leaf: Narrow
	intersection: readonly NarrowConstraint<Narrow>[]
	rule: rule
	attributes: {}
	disjoinable: false
}> {
	readonly kind = "narrow"

	writeDefaultDescription() {
		return isArray(this.rule)
			? this.rule.join(" and ")
			: `valid according to ${this.rule.name}`
	}

	intersectRule(): Orthogonal {
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
