import type { AbstractableConstructor, Dict, listable } from "@arktype/util"

import { Disjoint } from "../disjoint.js"
import type { Constraint } from "../traits/constraint.js"
import type { Morphable } from "../traits/morph.js"
import type { Typed } from "./type.js"
import { typedNode } from "./type.js"

export interface Predicate<t = unknown> extends Typed<t> {
	args: [rule: readonly Constraint[]]
}

// // discriminate is cached so we don't have to worry about this running multiple times
// get discriminant() {
// 	return discriminate(this.branches)
// }

export const predicate = typedNode<Predicate>()({
	kind: "predicate",
	writeDefaultDescription() {
		return this.rule.length ? this.rule.join(" and ") : "a value"
	},
	references() {
		return this.rule
	},
	intersect(other) {
		if (!other.hasKind("predicate")) {
			return other.intersect(this)
		}
		let result: readonly Constraint[] | Disjoint = this.rule
		for (const constraint of other.constraints) {
			if (result instanceof Disjoint) {
				break
			}
			result = constraint.apply(result)
		}
		// TODO: attributes
		return result instanceof Disjoint ? result : predicate(result)
	},
	keyof() {
		return this
	}
})

export interface PredicateRule {
	readonly morph?: readonly Morphable[]
}

export interface UnitRule {
	readonly identity: IdentityNode
}

export interface UnknownPredicateRule extends PredicateRule {
	readonly narrow?: readonly NarrowNode[]
}

export interface NumberPredicateRule extends DomainPredicateRule<"number"> {
	readonly range?: RangeConstraintSet
	readonly divisor?: DivisorNode
}

export interface InstancePredicateRule<
	constructor extends AbstractableConstructor = AbstractableConstructor
> extends DomainPredicateRule<"object"> {
	readonly instance: InstanceOfNode<constructor>
}

export interface StringPredicateRule extends DomainPredicateRule<"string"> {
	readonly length?: RangeConstraintSet
	readonly pattern?: DivisorNode
}

export interface DomainPredicateRule<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends UnknownPredicateRule {
	readonly domain: DomainConstraint<domain>
}

export interface DatePredicateRule extends InstancePredicateRule<typeof Date> {
	readonly range?: RangeConstraintSet
}

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1

// Figure out best design for integrating with named props.
export interface ArrayPredicateRule
	extends InstancePredicateRule<typeof Array> {
	readonly length?: RangeConstraintSet
	readonly prefix?: readonly Root[]
	readonly variadic?: Root
	readonly postfix?: readonly Root[]
}

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
