import { isArray, throwInternalError } from "@arktype/util"
import type {
	Basis,
	Constraint,
	Refinement,
	RefinementKind
} from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseSchema } from "../schema.js"
import { BaseNode } from "../schema.js"
import { inferred } from "../utils.js"
import type { TypeRoot } from "./type.js"

type applicableRefinementKind<basis extends Basis | undefined> = {
	[k in RefinementKind]: Refinement<k>["applicableTo"] extends (
		allowedBasis: Basis | undefined
	) => allowedBasis is basis
		? k
		: never
}[RefinementKind]

export type PredicateInput<basis extends Basis = Basis> =
	| readonly Refinement<applicableRefinementKind<undefined>>[]
	| [
			basis: basis,
			...refinements: Refinement<applicableRefinementKind<basis>>[]
	  ]

export interface PredicateSchema<basis extends Basis = Basis>
	extends BaseSchema {
	constraints: PredicateInput<basis>
}

export class PredicateNode<t = unknown>
	extends BaseNode<PredicateSchema, typeof PredicateNode>
	implements TypeRoot<t>
{
	readonly kind = "predicate"

	declare infer: t;
	declare [inferred]: t

	static parse<basis extends Basis>(
		input: PredicateInput<basis> | PredicateSchema<basis>
	) {
		return isArray(input) ? { constraints: input } : input
	}

	writeDefaultDescription() {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	allows() {
		return true
	}
	//intersect, isUnknown, isNever, array, extends

	intersect(other: TypeRoot) {
		return this
	}

	extends(other: TypeRoot) {
		return false
	}

	isUnknown(): this is PredicateNode<unknown> {
		return this.constraints.length === 0
	}

	isNever() {
		return false
	}

	references() {
		return [this]
	}

	array() {
		return this as never
	}

	hash() {
		return ""
	}

	constrain(constraint: Constraint): readonly Constraint[] | Disjoint {
		const result: Constraint[] = []
		let includesConstraint = false
		for (let i = 0; i < this.constraints.length; i++) {
			const elementResult = constraint.reduce(this.constraints[i])
			if (elementResult === null) {
				result.push(this.constraints[i])
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
			result.push(this as never)
		}
		return result
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
