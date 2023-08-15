import type { UniversalAttributes } from "../attributes/attribute.js"
import type { ConstraintNode } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { RootNode } from "./type.js"
import { TypeNode } from "./type.js"

export class PredicateNode<t = unknown> extends TypeNode<t> {
	readonly kind = "predicate"

	constructor(
		public rule: readonly ConstraintNode[],
		public attributes: UniversalAttributes = {}
	) {
		super()
	}

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

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

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
