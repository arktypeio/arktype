import type { satisfy } from "@arktype/util"
import type { UniversalAttributes } from "./attributes/attribute.js"
import type { ConstraintNode } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import type { NodeDefinition } from "./node.js"
import { BaseNode } from "./node.js"
import { assertOverlapping } from "./utils.js"

export type PredicateNodeDefinition = satisfy<
	NodeDefinition,
	{
		kind: "predicate"
		rule: readonly ConstraintNode[]
		attributes: UniversalAttributes
		node: PredicateNode
	}
>

export class PredicateNode extends BaseNode<PredicateNodeDefinition> {
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
