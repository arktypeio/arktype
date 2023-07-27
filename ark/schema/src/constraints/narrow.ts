import type { ConstraintRule } from "./constraint.js"
import { ConstraintNode, ConstraintSet } from "./constraint.js"

export interface NarrowRule extends ConstraintRule {
	readonly narrow: Narrow
}

// TODO: allow changed order to be the same type

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowNode extends ConstraintNode<NarrowRule, typeof NarrowNode> {
	static writeDefaultDescription(rule: NarrowRule) {
		return `valid according to ${rule.narrow.name}`
	}

	intersectOwnKeys(other: NarrowNode) {
		return this.narrow === other.narrow ? this : null
	}
}

export const NarrowSet = ConstraintSet<readonly NarrowNode[]>

export type NarrowSet = typeof NarrowSet

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
