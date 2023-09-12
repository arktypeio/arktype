import { throwInternalError } from "@arktype/util"
import type {
	Basis,
	Constraint,
	ConstraintNode,
	ConstraintSchema
} from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import type { BaseSchema, BasisInput, inputFor } from "./schema.js"
import { BaseNode } from "./schema.js"

export interface PredicateSchema<basis extends Basis = Basis>
	extends BaseSchema {
	basis: basis
}

type parseBasis<basis extends BasisInput> = basis extends inputFor<"domain">
	? "domain"
	: basis extends inputFor<"prototype">
	? "prototype"
	: basis extends inputFor<"identity">
	? "identity"
	: never

export type PredicateInput<basis extends BasisInput = BasisInput> =
	| Record<PropertyKey, never>
	| { narrow?: inputFor<"narrow"> }
	| ({ basis: basis } & {})

const s: PredicateInput = {
	foo: ""
}

export const predicate = <input extends PredicateInput>(input: input) =>
	({}) as parseBasis<input["basis"]>

const z = predicate({ basis: "string" })

export class PredicateNode<t = unknown> extends BaseNode<PredicateSchema> {
	readonly kind = "predicate"
	declare infer: t

	declare constraints: ConstraintNode<ConstraintSchema>[]

	writeDefaultDescription() {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	allows() {
		return true
	}

	intersect(other: PredicateNode) {
		let result: readonly Constraint[] | Disjoint = this.constraints
		for (const constraint of other.constraints) {
			if (result instanceof Disjoint) {
				break
			}
			result = this.addConstraint(constraint)
		}
		// TODO: attributes
		return result instanceof Disjoint
			? result
			: new PredicateNode({ constraints: result })
	}

	keyof() {
		return this
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

	protected addConstraint(
		constraint: Constraint
	): readonly Constraint[] | Disjoint {
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
