import type { Dict, evaluate, extend, List } from "@arktype/util"
import { transform } from "@arktype/util"
import type { BaseRule, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import type { BoundSet } from "../constraints/bound.js"
import { ConstraintSet } from "../constraints/constraint.js"
import type { DivisorSet } from "../constraints/divisor.js"
import type { NarrowSet } from "../constraints/narrow.js"
import type { PatternSet } from "../constraints/pattern.js"
import type { PrototypeSet } from "../constraints/prototype.js"
import { Disjoint } from "../disjoint.js"

export type PredicateRule<
	AllowedConstraintKind extends NonUniversalConsraintKind = never
> = evaluate<
	BaseRule & {
		[k in AllowedConstraintKind | "narrow"]?: ConstraintSetsByKind[k]
	}
>

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

	readonly constraints = constraintsOf(this.constraints)
	readonly flat = flatConstraintsOf(this.constraints)

	override intersectOwnKeys(other: InstanceType<subclass>) {
		const l = this.constraints as UnknownConstraints
		const r = other.constraints as UnknownConstraints
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
		return result as unknown as rule
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
