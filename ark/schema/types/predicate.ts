import type { AbstractableConstructor, intersectUnion } from "@arktype/util"
import { compose } from "@arktype/util"
import { Morphable } from "../attributes/morph.js"
import type { Basis } from "../bases/basis.js"
import type { NonEnumerableDomain } from "../bases/domain.js"
import type { IdentityConstraint } from "../bases/identity.js"
import type {
	RefinementKind,
	RefinementRules
} from "../constraints/constraint.js"
import { inferred } from "../utils.js"
import { TypeRoot } from "./type.js"

type flattenConstraints<constraints> = readonly {
	[k in keyof constraints]: constraints[k] extends readonly unknown[]
		? constraints[k][number]
		: constraints[k]
}[]

export type RulesForBasis<basis extends Basis | undefined> = intersectUnion<
	{
		[k in RefinementKind]: basis extends RefinementRules[k]["basis"]
			? Omit<RefinementRules[k], "basis">
			: {}
	}[RefinementKind]
>
type BasisInput =
	| AbstractableConstructor
	| NonEnumerableDomain
	| { is: unknown }

type instantiateBasisInput<input extends BasisInput> = input extends {
	is: infer rule
}
	? IdentityConstraint<rule>
	: input extends AbstractableConstructor
	? PrototypeConstraint<input>
	: DomainConstraint<input & NonEnumerableDomain>

export type MaybeParsedBasis = Basis | BasisInput | undefined

export type parseBasis<basis extends MaybeParsedBasis> =
	basis extends BasisInput ? instantiateBasisInput<basis> : basis

export type PredicateInput<basis extends MaybeParsedBasis = MaybeParsedBasis> =
	{
		basis?: basis
	} & RulesForBasis<parseBasis<basis>>

export type inferPredicateInput<input extends PredicateInput> =
	input extends PredicateInput<infer basis>
		? parseBasis<basis> extends { infer: infer t }
			? t
			: unknown
		: never

export const predicate = <const input extends PredicateInput>(rule: input) =>
	new Predicate<inferPredicateInput<input>>(rule as never)

export class Predicate<t = unknown> extends compose(TypeRoot, Morphable) {
	readonly kind = "predicate"
	readonly constraints: flattenConstraints<this["rule"]>

	declare infer: t;
	declare [inferred]: t

	constructor(
		public rule: PredicateInput<any>,
		public attributes?: {}
	) {
		super(rule, attributes)
		this.constraints = Object.values(this.rule).flat() as never
	}

	writeDefaultDescription(): string {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	references() {
		return [this]
	}

	hash(): string {
		return ""
	}

	// intersect(other: this) {
	// 	if (!other.hasKind("predicate")) {
	// 		return other.intersect(this)
	// 	}
	// 	let result: readonly Constraint[] | Disjoint = this.rule
	// 	for (const constraint of other.constraints) {
	// 		if (result instanceof Disjoint) {
	// 			break
	// 		}
	// 		result = constraint.apply(result)
	// 	}
	// 	// TODO: attributes
	// 	return result instanceof Disjoint ? result : new Predicate(result)
	// }

	keyof() {
		return this
	}
}

// export class ArrayPredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Array>,
// 	Boundable
// ) {
// 	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// 	// to a single variadic number prop with minLength 1
// 	// Figure out best design for integrating with named props.

// 	readonly prefix?: readonly TypeRoot[]
// 	readonly variadic?: TypeRoot
// 	readonly postfix?: readonly TypeRoot[]
// }

// export class DatePredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Date>,
// 	Boundable
// ) {}

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
