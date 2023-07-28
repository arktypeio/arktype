import type { BaseRule } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "./constraint.js"

export interface NarrowRule extends BaseRule {
	readonly validator: Narrow
}

// TODO: allow changed order to be the same type

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowNode extends BaseNode<NarrowRule, typeof NarrowNode> {
	static writeDefaultDescription(rule: NarrowRule) {
		return `valid according to ${rule.validator.name}`
	}

	intersectOwnKeys(other: NarrowNode) {
		return this.validator === other.validator ? this : null
	}
}

export const NarrowSet = ConstraintSet<readonly NarrowNode[]>

export type NarrowSet = InstanceType<typeof NarrowSet>

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
