import type { AbstractableConstructor, extend } from "@arktype/util"
import type { UniversalAttributes } from "./attributes/attribute.js"
import type { Constraint, ConstraintSet } from "./constraints/constraint.js"
import type { DivisibilityConstraint } from "./constraints/divisibility.js"
import type { NonEnumerableDomain } from "./constraints/domain.js"
import type { IdentityConstraint } from "./constraints/identity.js"
import type { NarrowSet } from "./constraints/narrow.js"
import type { RangeSet } from "./constraints/range.js"
import type { RegexSet } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import { BaseNode } from "./type.js"

export class PredicateNode extends BaseNode<ConstraintRecord> {
	readonly kind = "predicate"

	static from(constraints: ConstraintRecord, attributes: UniversalAttributes) {
		return new PredicateNode(constraints, attributes)
	}

	// readonly references: readonly TypeNode[] = this.props?.references ?? []

	writeDefaultDescription() {
		const basisDescription =
			this.writeDefaultBaseDescription?.(this.rule) ?? "a value"
		const flat = Object.values(this.rule).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	intersectRules(other: PredicateNode) {
		const intersection: ConstraintRecord = { ...this.rule, ...other.rule }
		for (const k in intersection) {
			if (k in this.rule && k in other.rule) {
				const subresult = this.rule[k].intersect(other.rule[k] as never)
				if (subresult instanceof Disjoint) {
					return subresult
				}
				// TODO: narrow record type to kinds so this isn't casted
				intersection[k] = subresult as never
			}
		}
		return intersection
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
	readonly identity: IdentityConstraint
}

export type UnknownConstraints = {
	readonly narrow?: NarrowSet
}

export type ConstraintRecord = Record<string, Constraint | ConstraintSet>

export type DomainConstraints<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = extend<
	UnknownConstraints,
	{
		readonly domain: domain
	}
>

export type ConstructorConstraints<
	constructor extends AbstractableConstructor = AbstractableConstructor
> = extend<
	DomainConstraints<"object">,
	{
		readonly instance: constructor
	}
>

export type NumberConstraints = extend<
	DomainConstraints<"number">,
	{
		readonly range?: RangeSet
		readonly divisor?: DivisibilityConstraint
	}
>

export type ObjectConstraints = DomainConstraints<"object">

export type StringConstraints = extend<
	DomainConstraints<"string">,
	{
		readonly length?: RangeSet
		readonly pattern?: RegexSet
	}
>

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export type ArrayConstraints = extend<
	ConstructorConstraints<typeof Array>,
	{
		readonly length?: RangeSet
		readonly prefixed?: readonly BaseNode[]
		readonly variadic?: BaseNode
		readonly postfixed?: readonly BaseNode[]
	}
>

export type DateConstraints = extend<
	ConstructorConstraints<typeof Date>,
	{
		readonly range?: RangeSet
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
