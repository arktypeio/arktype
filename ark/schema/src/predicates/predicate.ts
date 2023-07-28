import type { Dict } from "@arktype/util"
import { Domain, entriesOf, transform } from "@arktype/util"
import type { BaseRule, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "../constraints/constraint.js"
import type { NarrowSet } from "../constraints/narrow.js"

export interface PredicateRule extends BaseRule {
	readonly narrows?: NarrowSet
}

type UnknownConstraints = Dict<string, ConstraintSet>

const constraintsOf = (rule: PredicateRule): UnknownConstraints =>
	transform(rule, ([k, v]) =>
		v instanceof ConstraintSet ? [k, v] : []
	) as never

export class PredicateNode<
	rule extends PredicateRule = PredicateRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends BaseNode<rule, subclass> {
	static writeDefaultBaseDescription?(rule: never): string

	static writeDefaultDescription(rule: PredicateRule) {
		const basisDescription =
			this.writeDefaultBaseDescription?.(rule as never) ?? "a value"
		const flat = Object.values(constraintsOf(rule)).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	readonly constraints = constraintsOf(this)
	readonly flat = Object.values(this.constraints).flat()

	// TODO: Convert constraints to object, implement intersectOwnKeys here?
	// Maybe will end up needing to override, but hopefully can just handle all
	// the custom reduction logic in constructor/rule reducer of some sort, e.g.
	// array props.
	override intersectOwnKeys(other: PredicateNode) {}
}
