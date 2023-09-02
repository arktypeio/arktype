import { compose, DynamicBase } from "@arktype/util"
import { Boundable } from "../traits/bound.js"
import { type ConstraintKind } from "../traits/constraint.js"
import { Divisible } from "../traits/divisor.js"
import type { IdentityConstraint } from "../traits/identity.js"
import { Morphable } from "../traits/morph.js"
import { Narrowable } from "../traits/narrow.js"
import { Instantiatable } from "../traits/prototype.js"
import { Matchable } from "../traits/regex.js"
import { TypeRoot } from "./type.js"

type flattenConstraints<constraints> = readonly {
	[k in keyof constraints]: constraints[k] extends readonly unknown[]
		? constraints[k][number]
		: constraints[k]
}[]

export class Predicate<t = unknown> extends compose(TypeRoot, Morphable) {
	readonly kind = "predicate"
	readonly constraints: flattenConstraints<this["rule"]>

	constructor(
		public rule: {},
		public attributes?: {}
	) {
		super(rule, attributes)
		this.constraints = Object.values(this.rule).flat() as never
	}

	declare infer: t

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

export class IdentityPredicate extends compose(Predicate) {
	constructor(rule: { identity: IdentityConstraint }) {
		super(rule, {})
	}
}

export class UnknownPredicate extends compose(Predicate, Narrowable) {}

export class NumberPredicate extends compose(
	UnknownPredicate,
	Divisible,
	Boundable
) {}

export class StringPredicate extends compose(
	UnknownPredicate,
	Matchable,
	Boundable
) {}

export class ObjectPredicate extends compose(
	UnknownPredicate,
	Instantiatable
) {}

export class ArrayPredicate extends compose(UnknownPredicate, Boundable) {
	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
	// to a single variadic number prop with minLength 1
	// Figure out best design for integrating with named props.

	readonly prefix?: readonly TypeRoot[]
	readonly variadic?: TypeRoot
	readonly postfix?: readonly TypeRoot[]
}

export class DatePredicate extends compose(UnknownPredicate, Boundable) {}

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
