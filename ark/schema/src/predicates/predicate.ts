import type { Dict, evaluate, extend, List } from "@arktype/util"
import { transform } from "@arktype/util"
import type { BaseAttributes, BaseConstraints, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import type { BoundSet } from "../constraints/bound.js"
import { ConstraintSet } from "../constraints/constraint.js"
import type { DivisorSet } from "../constraints/divisor.js"
import type { NarrowSet } from "../constraints/narrow.js"
import type { PatternSet } from "../constraints/pattern.js"
import type { PrototypeSet } from "../constraints/prototype.js"
import { Disjoint } from "../disjoint.js"

export type PredicateConstraints<
	AllowedConstraintKind extends NonUniversalConsraintKind = never
> = evaluate<
	BaseConstraints & {
		[k in AllowedConstraintKind | "narrow"]?: ConstraintSetsByKind[k]
	}
>

export class PredicateNode<
	subclass extends NodeSubclass<constraints, attributes>,
	constraints extends PredicateConstraints,
	attributes extends BaseAttributes
> extends BaseNode<subclass, constraints, attributes> {
	constructor(constraints = {} as constraints) {
		super(constraints)
	}

	static writeDefaultBaseDescription?(rule: never): string

	static writeDefaultDescription(rule: PredicateConstraints) {
		const basisDescription =
			this.writeDefaultBaseDescription?.(rule as never) ?? "a value"
		const flat = Object.values(constraintsOf(rule)).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	static intersectConstraints(
		l: PredicateConstraints,
		r: PredicateConstraints
	) {
		const result = { ...l, ...r }
		for (const k in result) {
			if (k in l && k in r) {
				const setResult = l[k].intersect(r[k])
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return result
	}
}

export const constraintKinds = [
	"bound",
	"divisor",
	"narrow",
	"pattern",
	"prototype"
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export type ConstraintSetsByKind = extend<
	Record<ConstraintKind, ConstraintSet>,
	Readonly<{
		bound: BoundSet
		divisor: DivisorSet
		narrow: NarrowSet
		pattern: PatternSet
		prototype: PrototypeSet
	}>
>

export type NonUniversalConsraintKind = Exclude<ConstraintKind, "narrow">

type constraintsOf<rule extends PredicateConstraints> = {
	[k in keyof rule as rule[k] extends ConstraintSet | undefined
		? k
		: never]: rule[k]
}

const constraintsOf = <rule extends PredicateConstraints>(
	rule: rule
): constraintsOf<rule> =>
	transform(rule, ([k, v]) =>
		v instanceof ConstraintSet ? [k, v] : []
	) as never

type flatConstraintsOf<rule extends PredicateConstraints> = List<
	Extract<rule[keyof rule], ConstraintSet>[number]
>

const flatConstraintsOf = <rule extends PredicateConstraints>(
	rule: rule
): flatConstraintsOf<rule> => Object.values(constraintsOf(rule)).flat() as never
