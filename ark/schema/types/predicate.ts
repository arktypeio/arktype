import type { AbstractableConstructor } from "@arktype/util"
import type {
	ConstraintNode,
	ConstraintsByKind
} from "../constraints/constraint.js"
import type { NonEnumerableDomain } from "../constraints/domain.js"
import { Disjoint } from "../disjoint.js"
import type { RootNode } from "./type.js"
import { TypeNode } from "./type.js"

export class PredicateNode<t = unknown> extends TypeNode<
	t,
	readonly ConstraintNode[]
> {
	readonly kind = "predicate"

	writeDefaultDescription() {
		const flat = Object.values(this.rule).flat()
		return flat.length ? flat.join(" and ") : "a value"
	}

	references() {
		return []
	}

	intersect(other: RootNode): RootNode | Disjoint {
		if (!other.hasKind("predicate")) {
			return other.intersect(this)
		}
		let result: readonly ConstraintNode[] | Disjoint = this.rule
		for (const constraint of other.rule) {
			if (result instanceof Disjoint) {
				break
			}
			result = constraint.apply(result)
		}
		// TODO: attributes
		return result instanceof Disjoint ? result : new PredicateNode(result)
	}

	keyof() {
		return this
	}
}

type ConstraintNodeRecord = Partial<ConstraintsByKind>

export const predicateNode = <
	basis extends PredicateInputBasis,
	refinements,
	attributes
>() => {}

export type PredicateInputBasis =
	| NonEnumerableDomain
	| AbstractableConstructor
	| IdentityBasis
	| null

export type IdentityBasis<value = unknown> = {
	readonly identity: value
}

type createPredicateInput<basis extends PredicateInputBasis> = basis

export type RefinementInput<
	basis extends PredicateInputBasis = PredicateInputBasis
> = ConstraintsByKind[ConstraintKindsByBasis<basis>]

type ConstraintKindsByBasis<
	basis extends PredicateInputBasis = PredicateInputBasis
> = basis extends IdentityBasis
	? never
	:
			| "narrow"
			| (basis extends null
					? never
					: basis extends NonEnumerableDomain
					? basis extends "string"
						? "range" | "pattern"
						: basis extends "number"
						? "range" | "divisor"
						: never
					: basis extends AbstractableConstructor
					? basis extends typeof Array
						? "range"
						: basis extends typeof Date
						? "range"
						: never
					: never)

// export type UnitConstraints = Pick<ConstraintsByKind, "identity">

// export type UnknownConstraints = PickPartial<ConstraintsByKind, "narrow">

// export type DomainConstraints<
// 	domain extends NonEnumerableDomain = NonEnumerableDomain
// > = extend<UnknownConstraints, Pick<ConstraintsByKind, "domain">>

// export type NumberConstraints = extend<
// 	DomainConstraints<"number">,
// 	PickPartial<ConstraintsByKind, "range" | "divisor">
// >

// export type InstanceConstraints<
// 	constructor extends AbstractableConstructor = AbstractableConstructor
// > = extend<
// 	DomainConstraints<"object">,
// 	{ readonly instance: InstanceOfConstraint }
// >

// export type StringConstraints = extend<
// 	DomainConstraints<"string">,
// 	PickPartial<ConstraintsByKind, "range" | "pattern">
// >

// // TODO: add minLength prop that would result from collapsing types like [...number[], number]
// // to a single variadic number prop with minLength 1
// // Figure out best design for integrating with named props.
// export type ArrayConstraints = extend<
// 	InstanceConstraints<typeof Array>,
// 	{
// 		readonly range?: RangeConstraint
// 		readonly prefix?: readonly BaseNode[]
// 		readonly variadic?: BaseNode
// 		readonly postfix?: readonly BaseNode[]
// 	}
// >

// export type DateConstraints = extend<
// 	InstanceConstraints<typeof Date>,
// 	{
// 		readonly range?: RangeConstraint
// 	}
// >

// export type DateConstraints = extend<
// 	InstanceConstraints<typeof Date>,
// 	{
// 		readonly range?: RangeConstraint
// 	}
// >

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

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
