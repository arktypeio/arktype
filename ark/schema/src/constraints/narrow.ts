import { ConstraintNode, ConstraintSet } from "./constraint.js"

// TODO: allow changed order to be the same type

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowNode extends ConstraintNode<Narrow> {
	writeDefaultDescription() {
		return `valid according to ${this.rule.name}`
	}

	intersectRules(other: NarrowNode) {
		return this.rule === other.rule ? this.rule : null
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
