import { composeConstraint } from "./constraint.js"

export type BoundKind = "date" | "number"

export interface BoundRule<limitKind extends LimitKind = LimitKind> {
	// TODO: remove this from rule
	readonly boundKind: BoundKind
	readonly limitKind: limitKind
	readonly limit: number
	readonly exclusive: boolean
}

export class BoundConstraint<
	limitKind extends LimitKind = LimitKind
> extends composeConstraint<BoundRule>((l, r) => {
	if (l.limit > r.limit) {
		if (l.limitKind === "min") {
			return r.limitKind === "min" ? [l] : []
		}
		return r.limitKind === "max" ? [r] : [l, r]
	}
	if (l.limit < r.limit) {
		if (l.limitKind === "max") {
			return r.limitKind === "max" ? [l] : []
		}
		return r.limitKind === "min" ? [r] : [l, r]
	}
	return l.limitKind === r.limitKind
		? [l.exclusive ? l : r]
		: l.exclusive || r.exclusive
		? []
		: [l, r]
}) {
	readonly kind = "bound"

	declare rule: BoundRule<limitKind>

	hash() {
		// TODO:
		return ""
	}

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
}

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
