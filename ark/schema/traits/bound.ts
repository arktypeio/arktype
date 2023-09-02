import { Disjoint } from "../disjoint.js"
import { composeConstraint } from "./constraint.js"

export type BoundKind = "date" | "number"

export interface BoundRule<limitKind extends LimitKind = LimitKind> {
	// TODO: remove this from rule
	readonly boundKind: BoundKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export type BoundSet =
	| readonly [BoundConstraint]
	| readonly [BoundConstraint<"min">, BoundConstraint<"max">]

export class BoundConstraint<
	limitKind extends LimitKind = LimitKind
> extends composeConstraint<BoundRule>((l, r) => {
	if (l.limit > r.limit) {
		if (l.limitKind === "min") {
			return r.limitKind === "min" ? [l] : Disjoint.from("bound", l, r)
		}
		return r.limitKind === "max" ? [r] : [r, l]
	}
	if (l.limit < r.limit) {
		if (l.limitKind === "max") {
			return r.limitKind === "max" ? [l] : Disjoint.from("bound", l, r)
		}
		return r.limitKind === "min" ? [r] : [l, r]
	}
	return l.limitKind === r.limitKind
		? [l.exclusive ? l : r]
		: l.exclusive || r.exclusive
		? Disjoint.from("bound", l, r)
		: l.limitKind === "min"
		? [l, r]
		: [r, l]
}) {
	readonly kind = "bound"

	declare rule: BoundRule<limitKind>

	hash() {
		return ""
	}

	writeDefaultDescription() {
		return describeBound(this.rule)
	}
}

export class Boundable {
	constructor(rule: { bounds?: BoundSet }) {}
}

export const describeBound = (rule: BoundRule) =>
	`${
		rule.boundKind === "date"
			? describeDateComparison(rule)
			: describeNumericComparison(rule)
	} ${rule.limit}`

const describeDateComparison = (rule: BoundRule) =>
	rule.limitKind === "min"
		? rule.exclusive
			? "after"
			: "at or after"
		: rule.exclusive
		? "before"
		: "at or before"

const describeNumericComparison = (rule: BoundRule) =>
	rule.limitKind === "min"
		? rule.exclusive
			? "more than"
			: "at least"
		: rule.exclusive
		? "less than"
		: "at most"

const unitsByBoundedKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundableDataKind = keyof typeof unitsByBoundedKind

export type LimitKind = "min" | "max"

export const writeIncompatibleRangeMessage = (
	l: BoundableDataKind,
	r: BoundableDataKind
) => `Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]
