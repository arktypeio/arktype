import type { Node } from "../base.js"
import type { BasisKind, PrimitiveKind, PropKind } from "./define.js"

export type ConstraintKindsByGroup = {
	basis: BasisKind
	shallow: Exclude<PrimitiveKind, "predicate">
	deep: PropKind
	predicate: "predicate"
}

export type GroupedConstraints = {
	[k in ConstraintGroupName]?: Node<ConstraintKindsByGroup[k]>[]
}

export type ConstraintGroupName = keyof ConstraintKindsByGroup

export const precedenceByConstraintGroup: Record<ConstraintGroupName, number> =
	{
		basis: 0,
		shallow: 1,
		deep: 2,
		predicate: 3
	}
