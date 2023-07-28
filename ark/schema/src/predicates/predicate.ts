import type { Dict } from "@arktype/util"
import { Domain, entriesOf, transform } from "@arktype/util"
import type { BaseRule, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "../constraints/constraint.js"
import type { NarrowSet } from "../constraints/narrow.js"

export interface PredicateRule extends BaseRule {
	readonly narrows?: NarrowSet
}

type UnknownConstraints = Dict<string, BaseNode | ConstraintSet>

const constraintsOf = (rule: PredicateRule) =>
	transform(rule, ([k, v]) =>
		v instanceof BaseNode || v instanceof ConstraintSet ? [k, v] : []
	) as UnknownConstraints

const flattenConstraints = (
	constraints: UnknownConstraints
): readonly BaseNode[] => Object.values(constraints).flat()

export type PredicateSubclass<rule extends PredicateRule = PredicateRule> = {
	new (rule: rule): BaseNode<any, any>
}

export class PredicateNode<
	rule extends PredicateRule = PredicateRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends BaseNode<rule, subclass> {
	static writeDefaultBaseDescription?(rule: never): string

	static writeDefaultDescription(rule: PredicateRule) {
		const basisDescription =
			this.writeDefaultBaseDescription?.(rule as never) ?? "a value"
		const flat = flattenConstraints(constraintsOf(rule))
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	readonly constraints = constraintsOf(this)
	readonly flat = flattenConstraints(this.constraints)

	// TODO: Convert constraints to object, implement intersectOwnKeys here?
	// Maybe will end up needing to override, but hopefully can just handle all
	// the custom reduction logic in constructor/rule reducer of some sort, e.g.
	// array props.
	override intersectOwnKeys() {}
}
