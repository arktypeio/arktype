import type { Dict, List, mutable } from "@arktype/util"
import { hasKey, transform } from "@arktype/util"
import type { BaseRule, IntersectOwnKeys, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import type { ConstraintSetsByKind } from "../constraints/constraint.js"
import { constraintKinds, ConstraintSet } from "../constraints/constraint.js"
import type { NarrowSet } from "../constraints/narrow.js"
import { Disjoint } from "../disjoint.js"

export interface PredicateRule extends BaseRule {
	readonly narrows?: NarrowSet
}

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

type UnknownConstraints = Dict<string, ConstraintSet>

export class PredicateNode<
	rule extends PredicateRule = PredicateRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends BaseNode<rule, subclass> {
	constructor(rule = {} as rule) {
		super(rule)
		this.intersectors.push(intersectPredicates)
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
}

const intersectPredicates = (
	l: UnknownConstraints,
	r: UnknownConstraints
): UnknownConstraints | Disjoint => {
	const result: mutable<UnknownConstraints> = {}
	for (const k of constraintKinds) {
		if (l[k]) {
			if (r[k]) {
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
	}
	return result
}
