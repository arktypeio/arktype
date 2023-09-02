import type {
	AbstractableConstructor,
	intersectUnion,
	unionToTuple
} from "@arktype/util"
import { compose } from "@arktype/util"
import type {
	BasisKind,
	Constraint,
	RefinementKind,
	RefinementRules
} from "../traits/constraint.js"
import type { NonEnumerableDomain } from "../traits/domain.js"
import { DomainConstraint } from "../traits/domain.js"
import type { IdentityConstraint } from "../traits/identity.js"
import { Morphable } from "../traits/morph.js"
import type { PrototypeConstraint } from "../traits/prototype.js"
import { inferred } from "../utils.js"
import { TypeRoot } from "./type.js"

type flattenConstraints<constraints> = readonly {
	[k in keyof constraints]: constraints[k] extends readonly unknown[]
		? constraints[k][number]
		: constraints[k]
}[]

export type RulesForBasis<basis extends Constraint<BasisKind> | undefined> =
	intersectUnion<
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

export type MaybeParsedBasis = Constraint<BasisKind> | BasisInput | undefined

export type parseBasis<basis extends MaybeParsedBasis> =
	basis extends BasisInput ? instantiateBasisInput<basis> : basis

export const predicate = <const basis extends MaybeParsedBasis>(
	rule: { basis?: basis } & RulesForBasis<parseBasis<basis>>
	// TODO: Fix
) =>
	new Predicate<
		parseBasis<basis> extends { infer: infer t } ? t : unknown,
		parseBasis<basis>
	>({} as never)

export class Predicate<
	t = unknown,
	basis extends Constraint<BasisKind> | undefined =
		| Constraint<BasisKind>
		| undefined
> extends compose(TypeRoot, Morphable) {
	readonly kind = "predicate"
	readonly constraints: flattenConstraints<this["rule"]>

	declare infer: t;
	declare [inferred]: t

	constructor(
		public rule: { basis?: basis } & RulesForBasis<basis>,
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

const z = new Predicate({ basis: new DomainConstraint("string") }).infer

// export type PredicatesByKind = {
// 	identity: IdentityPredicate
// 	unknown: NarrowablePredicate
// 	number: NumberPredicate
// 	string: StringPredicate
// 	object: ObjectPredicate
// 	array: ArrayPredicate
// 	date: DatePredicate
// }

// export type PredicateKind = keyof PredicatesByKind

// export type Predicate<kind extends PredicateKind = PredicateKind> =
// 	PredicatesByKind[kind]

// export type PredicateRule<kind extends PredicateKind = PredicateKind> =
// 	Predicate<kind>["rule"]

// export class IdentityPredicate extends compose(BasePredicate) {
// 	constructor(rule: { identity: IdentityConstraint }) {
// 		super(rule, {})
// 	}
// }

// export class NarrowablePredicate extends composePredicate(Narrowable) {}

// export class NumberPredicate2 extends composeFromBasis<
// 	DomainConstraint<"number">
// >() {
// 	foo() {
// 		this.rule
// 	}
// }

// const n = new NumberPredicate2(
// 	{ basis: new DomainConstraint("number", {}) },
// 	{}
// )

// export class NumberPredicate extends composePredicate(
// 	Narrowable<"number">,
// 	Divisible,
// 	Boundable
// ) {}

// export class StringPredicate extends composePredicate(
// 	Narrowable<"string">,
// 	Matchable,
// 	Boundable
// ) {}

// export class ObjectPredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable
// ) {}

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
