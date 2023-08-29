import { Disjoint } from "../disjoint.js"
import { type BaseConstraint, constraint } from "./constraint.js"

export type BoundKind = "date" | "number"

export interface BoundRule<limitKind extends LimitKind = LimitKind> {
	// TODO: remove this from rule
	readonly boundKind: BoundKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export interface BoundConstraint extends BaseConstraint<BoundRule> {}

export const bound = constraint<BoundConstraint>((l, r) => {
	if (l.limit > r.limit) {
		if (l.limitKind === "min") {
			return r.limitKind === "min" ? l : Disjoint.from("range", l, r)
		}
		return r.limitKind === "max" ? r : null
	}
	if (l.limit < r.limit) {
		if (l.limitKind === "max") {
			return r.limitKind === "max" ? l : Disjoint.from("range", l, r)
		}
		return r.limitKind === "min" ? r : null
	}
	return l.limitKind === r.limitKind
		? l.exclusive
			? l
			: r
		: l.exclusive || r.exclusive
		? Disjoint.from("range", l, r)
		: null
})({
	kind: "bound",
	writeDefaultDescription() {
		const comparisonDescription =
			this.rule.boundKind === "date"
				? this.rule.limitKind === "min"
					? this.rule.exclusive
						? "after"
						: "at or after"
					: this.rule.exclusive
					? "before"
					: "at or before"
				: this.rule.limitKind === "min"
				? this.rule.exclusive
					? "more than"
					: "at least"
				: this.rule.exclusive
				? "less than"
				: "at most"
		return `${comparisonDescription} ${this.rule.limit}`
	}
})

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
