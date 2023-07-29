import type { Dict, List } from "@arktype/util"
import { transform } from "@arktype/util"
import type { BaseRule, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import { ConstraintSet } from "../constraints/constraint.js"
import type { NarrowSet } from "../constraints/narrow.js"
import { Disjoint } from "../disjoint.js"

export interface PredicateRule extends BaseRule {
	readonly narrows?: NarrowSet
}

type UnknownConstraints = Dict<string, ConstraintSet>

type constraintsOf<rule extends PredicateRule> = {
	[k in keyof rule as rule[k] extends ConstraintSet | undefined
		? k
		: never]: rule[k]
}

const constraintsOf = <rule extends PredicateRule>(
	rule: rule
): constraintsOf<rule> =>
	transform(rule, ([k, v]) =>
		v instanceof ConstraintSet ? [k, v] : []
	) as never

type flatConstraintsOf<rule extends PredicateRule> = List<
	Extract<rule[keyof rule], ConstraintSet>[number]
>

const flatConstraintsOf = <rule extends PredicateRule>(
	rule: rule
): flatConstraintsOf<rule> => Object.values(constraintsOf(rule)).flat() as never

export class PredicateNode<
	rule extends PredicateRule = PredicateRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends BaseNode<rule, subclass> {
	constructor(rule = {} as rule) {
		super(rule)
	}

	static writeDefaultBaseDescription?(rule: never): string

	static writeDefaultDescription(rule: PredicateRule) {
		const basisDescription =
			this.writeDefaultBaseDescription?.(rule as never) ?? "a value"
		const flat = Object.values(constraintsOf(rule)).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	readonly constraints = constraintsOf(this.rule)
	readonly flat = flatConstraintsOf(this.rule)

	override intersectOwnKeys(other: InstanceType<subclass>) {
		const l = this.constraints as UnknownConstraints
		const r = other.constraints as UnknownConstraints
		const result = { ...l, ...r }
		for (const k in result) {
			if (k in l && k in r) {
				let setResult: ConstraintSet | Disjoint = l[k]
				for (
					let i = 0;
					i < r[k].length && setResult instanceof ConstraintSet;
					i++
				) {
					setResult = setResult.add(r[k][i])
				}
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return result as unknown as rule
	}
}
