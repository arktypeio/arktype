import type { Domain, extend, mutable } from "@arktype/util"
import { isArray, throwInternalError } from "@arktype/util"
import type { UniversalAttributes } from "./attributes/attribute.js"
import type { BasisConstraint } from "./constraints/constraint.js"
import type { DivisibilityConstraint } from "./constraints/divisibility.js"
import type { EqualityConstraint } from "./constraints/equality.js"
import { Disjoint } from "./disjoint.js"
import { BaseNode, orthogonal } from "./type.js"

export class PredicateNode extends BaseNode<ConstraintSet> {
	readonly kind = "predicate"

	static from(constraints: ConstraintSet, attributes: UniversalAttributes) {
		return new PredicateNode(
			constraints.reduce<ConstraintSet>((set, constraint) => {
				const next = set.add(constraint)
				return next instanceof Disjoint ? next.throw() : next
			}, []),
			attributes
		)
	}

	// readonly references: readonly TypeNode[] = this.props?.references ?? []

	readonly domain: Domain = "string"
	readonly basis: BasisConstraint

	writeDefaultDescription() {
		const basisDescription =
			this.writeDefaultBaseDescription?.(this.rule) ?? "a value"
		const flat = Object.values(this.rule).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	intersectUniqueRules(other: PredicateNode) {
		let result: ConstraintSet | Disjoint = this.rule
		for (let i = 0; i < other.rule.length && isArray(result); i++) {
			result = constrain(this.rule, other.rule[i])
		}
		return result
	}

	constrain(constraint: Constraint): PredicateNode {
		const result = constrain(this.rule, constraint)
		return result instanceof Disjoint
			? result.throw()
			: new PredicateNode(result, this.attributes)
	}

	// keyof(): TypeNode {
	// 	if (!this.basis) {
	// 		return builtins.never()
	// 	}
	// 	const propsKey = this.props?.keyof()
	// 	return propsKey?.or(this.basis.keyof()) ?? this.basis.keyof()
	// }
}

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

export type UnitConstraints = {
	readonly value?: EqualityConstraint
}

export type UnknownConstraints = {
	readonly narrow?: NarrowSet
}

export type BasisConstraints<basis extends BasisRule = BasisRule> = extend<
	UnknownConstraints,
	{
		readonly basis: basis
	}
>

export type NumberConstraints = extend<
	BasisConstraints<"number">,
	{
		readonly range?: BoundSet
		readonly divisor?: DivisibilityConstraint
	}
>

export type ObjectConstraints = BasisConstraints<"object">

export type StringConstraints = extend<
	BasisConstraints<"string">,
	{
		readonly length?: BoundSet
		readonly pattern?: RegexSet
	}
>

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export type ArrayConstraints = extend<
	BasisConstraints<typeof Array>,
	{
		readonly length?: BoundSet
		readonly prefixed?: readonly BaseNode[]
		readonly variadic?: BaseNode
		readonly postfixed?: readonly BaseNode[]
	}
>

export type DateConstraints = extend<
	BasisConstraints<typeof Date>,
	{
		readonly range?: BoundSet
	}
>

// // TODO: naming
// export const constraintsByPrecedence: Record<
// 	BasisKind | RefinementKind,
// 	number
// > = {
// 	// basis
// 	domain: 0,
// 	class: 0,
// 	unit: 0,
// 	// shallow
// 	bound: 1,
// 	divisor: 1,
// 	regex: 1,
// 	// deep
// 	props: 2,
// 	// narrow
// 	narrow: 3
// }

export type ConstraintSet = readonly Constraint[]

// TODO: make sure in cases like range, the result is sorted
const constrain = (
	set: ConstraintSet,
	constraint: Constraint
): ConstraintSet | Disjoint => {
	const result = [] as mutable<ConstraintSet>
	let includesConstraint = false
	for (let i = 0; i < set.length; i++) {
		const elementResult = set[i].intersect(constraint)
		if (elementResult === orthogonal) {
			result.push(set[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesConstraint) {
			result.push(elementResult)
			includesConstraint = true
		} else if (!result.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
			)
		}
	}
	if (!includesConstraint) {
		result.push(constraint)
	}
	return result
}
