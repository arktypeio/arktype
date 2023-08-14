// TODO: allow changed order to be the same type
import type { satisfy } from "@arktype/util"
import { isArray } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import type { NodeDefinition } from "../node.js"
import { ConstraintNode } from "./constraint.js"

export type NarrowDefinition = satisfy<
	NodeDefinition,
	{
		kind: "narrow"
		rule: Narrow
		attributes: UniversalAttributes
		node: NarrowConstraint
	}
>

// as long as the narrows in l and r are individually safe to check
// in the order they're specified, checking them in the order
// resulting from this intersection should also be safe.
export class NarrowConstraint extends ConstraintNode<NarrowDefinition> {
	readonly kind = "narrow"

	writeDefaultDescription() {
		return isArray(this.rule)
			? this.rule.join(" and ")
			: `valid according to ${this.rule.name}`
	}

	protected reduceWithRuleOf() {
		return null
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
