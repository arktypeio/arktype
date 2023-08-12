import type { AbstractableConstructor, extend } from "@arktype/util"
import type { UniversalAttributes } from "./attributes/attribute.js"
import type { Constraint, ConstraintKind } from "./constraints/constraint.js"
import type { DivisorConstraint } from "./constraints/divisibility.js"
import type {
	DomainConstraint,
	NonEnumerableDomain
} from "./constraints/domain.js"
import type { IdentityConstraint } from "./constraints/identity.js"
import type { InstanceOfConstraint } from "./constraints/instanceOf.js"
import type { NarrowSet } from "./constraints/narrow.js"
import type { RangeConstraint, RangeSet } from "./constraints/range.js"
import type { RegexSet } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import { BaseNode } from "./type.js"
import { assertOverlapping } from "./utils.js"

export class PredicateNode extends BaseNode<ConstraintsByKind> {
	readonly kind = "predicate"

	static from(constraints: ConstraintsByKind, attributes: UniversalAttributes) {
		return new PredicateNode(constraints, attributes)
	}

	// readonly references: readonly TypeNode[] = this.props?.references ?? []

	writeDefaultDescription() {
		const flat = Object.values(this.rule).flat()
		return flat.join(" and ")
	}

	intersectRules(other: PredicateNode): ConstraintsByKind | Disjoint {
		const intersection: ConstraintsByKind = { ...this.rule, ...other.rule }
		let k: ConstraintKind
		for (k in intersection) {
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
		const result =
			constraint.kind in this.rule
				? assertOverlapping(this.rule[constraint.kind].intersect(constraint))
				: constraint
		return new PredicateNode(
			{
				...this.rule,
				[constraint.kind]: result
			},
			this.attributes
		)
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

export type ConstraintsByKind = {
	identity: IdentityConstraint
	domain: DomainConstraint
	divisor: DivisorConstraint
	instanceOf: InstanceOfConstraint
	range: RangeSet
	regex: RegexSet
	narrow: NarrowSet
}

export type Constraints =
	| UnitConstraints
	| UnknownConstraints
	| DomainConstraints
	| NumberConstraints
	| ObjectConstraints
	| StringConstraints
	| ArrayConstraints
	| DateConstraints

export type UnitConstraints = {
	readonly identity: IdentityConstraint
}

export type UnknownConstraints = {
	readonly narrow?: NarrowSet
}

export type DomainConstraints<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = extend<
	UnknownConstraints,
	{
		readonly domain: DomainConstraint
	}
>

export type NumberConstraints = extend<
	DomainConstraints<"number">,
	{
		readonly range?: RangeSet
		readonly divisor?: DivisorConstraint
	}
>

export type ObjectConstraints<
	constructor extends AbstractableConstructor = AbstractableConstructor
> = extend<
	DomainConstraints<"object">,
	AbstractableConstructor extends constructor
		? {
				readonly instance?: InstanceOfConstraint
		  }
		: { readonly instance: InstanceOfConstraint }
>

export type StringConstraints = extend<
	DomainConstraints<"string">,
	{
		readonly range?: RangeSet
		readonly regex?: RegexSet
	}
>

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export type ArrayConstraints = extend<
	ObjectConstraints<typeof Array>,
	{
		readonly range?: RangeSet
		readonly prefix?: readonly BaseNode[]
		readonly variadic?: BaseNode
		readonly postfix?: readonly BaseNode[]
	}
>

export type DateConstraints = extend<
	ObjectConstraints<typeof Date>,
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
