import type { BasisKind, PrimitiveKind, PropKind } from "./define.js"

export type ConstraintKindsByGroup = {
	basis: BasisKind
	shallow: Exclude<PrimitiveKind, "predicate">
	deep: PropKind
	predicate: "predicate"
}

export const precedenceByConstraintGroup: Record<ConstraintGroupName, number> =
	{
		basis: 0,
		shallow: 1,
		deep: 2,
		predicate: 3
	}

export type ConstraintGroupName = keyof ConstraintKindsByGroup

export class ConstraintGroup {}
