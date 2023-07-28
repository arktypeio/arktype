import { Domain, entriesOf } from "@arktype/util"
import type { BaseRule, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "../constraints/constraint.js"
import type { NarrowSet } from "../constraints/narrow.js"

export interface PredicateRule extends BaseRule {
	readonly narrows?: NarrowSet
}

const constraintsOf = (rule: PredicateRule) =>
	Object.values(rule).flatMap((v) =>
		v instanceof BaseNode || v instanceof ConstraintSet ? v : []
	) as readonly BaseNode[]

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
		const constraints = constraintsOf(rule)
		return constraints.length
			? `${basisDescription} ${constraints.join(" and ")}`
			: basisDescription
	}

	readonly constraints = constraintsOf(this)

	// TODO: Convert constraints to object, implement intersectOwnKeys here?
	// Maybe will end up needing to override, but hopefully can just handle all
	// the custom reduction logic in constructor/rule reducer of some sort, e.g.
	// array props.
	override intersectOwnKeys() {
		return this
		// return this.equals(other) ? this : Disjoint.from("unit", this, other)
	}
}
