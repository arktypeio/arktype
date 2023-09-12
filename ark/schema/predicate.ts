import type { conform } from "@arktype/util"
import { Hkt, throwInternalError } from "@arktype/util"
import type {
	Basis,
	BasisClassesByKind,
	BasisKind
} from "./constraints/basis.js"
import type {
	Refinement,
	RefinementClassesByKind,
	RefinementKind,
	RefinementNode
} from "./constraints/refinement.js"
import { Disjoint } from "./disjoint.js"
import type { BaseSchema, BasisInput, inputFor, parse } from "./schema.js"
import { BaseNode, parser } from "./schema.js"

export interface PredicateSchema<basis extends Basis = Basis>
	extends BaseSchema {
	basis: basis
}

type parseBasis<input extends BasisInput> = conform<
	{
		[k in BasisKind]: input extends inputFor<k>
			? parse<BasisClassesByKind[k], input>
			: never
	}[BasisKind],
	Basis
>

type basisOf<k extends RefinementKind> =
	Refinement<k>["applicableTo"] extends ((
		_: Basis
	) => _ is infer basis extends Basis)
		? basis
		: never

type refinementsOf<basis> = {
	[k in RefinementKind as basis extends basisOf<k> ? k : never]?: Refinement<k>
}

export type PredicateInput<basis extends BasisInput = BasisInput> =
	| Record<PropertyKey, never>
	| { narrow?: inputFor<"narrow"> }
	| ({ basis: basis } & refinementsOf<parseBasis<basis>>)

export const predicate = <basis extends BasisInput>(
	input: PredicateInput<basis>
) => ({}) as PredicateNode<parseBasis<basis>["infer"]>

const z = predicate({ basis: "string" })

export class PredicateNode<t = unknown> extends BaseNode<PredicateSchema> {
	readonly kind = "predicate"
	declare infer: t

	declare constraints: RefinementNode<BaseSchema>[]

	writeDefaultDescription() {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	allows() {
		return true
	}

	intersect(other: PredicateNode) {
		let result: readonly Refinement[] | Disjoint = this.constraints
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
		constraint: Refinement
	): readonly Refinement[] | Disjoint {
		const result: Refinement[] = []
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
