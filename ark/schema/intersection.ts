import type { conform, ErrorMessage, exactMessageOnError } from "@arktype/util"
import { throwInternalError } from "@arktype/util"
import type {
	Basis,
	BasisClassesByKind,
	BasisInput,
	BasisKind,
	validateBasisInput
} from "./constraints/basis.js"
import type { ConstraintNode } from "./constraints/constraint.js"
import type { DomainInput } from "./constraints/domain.js"
import type { ProtoInput } from "./constraints/proto.js"
import type { Refinement, RefinementKind } from "./constraints/refinement.js"
import type { UnitInput } from "./constraints/unit.js"
import { Disjoint } from "./disjoint.js"
import type { MorphInput } from "./morph.js"
import type { BaseAttributes, inputOf, parseNode } from "./type.js"
import { TypeNode } from "./type.js"

export type IntersectionSchema = BaseAttributes & {
	constraints: readonly ConstraintNode[]
}

type parseBasis<input extends BasisInput> = conform<
	{
		[k in BasisKind]: input extends BasisInput<k>
			? parseNode<BasisClassesByKind[k], input>
			: never
	}[BasisKind],
	Basis
>

type basisOf<k extends RefinementKind> =
	Refinement<k>["applicableTo"] extends ((
		_: Basis | undefined
	) => _ is infer basis extends Basis | undefined)
		? basis
		: never

type refinementKindOf<basis> = {
	[k in RefinementKind]: basis extends basisOf<k> ? k : never
}[RefinementKind]

export type refinementsOf<basis> = {
	[k in refinementKindOf<basis>]?: Refinement<k>
}

type refinementInputsOf<basis> = {
	[k in refinementKindOf<basis>]?: inputOf<k>
}

type IntersectionBasisInput<basis extends BasisInput = BasisInput> =
	| {
			domain: conform<basis, DomainInput>
			proto?: never
			unit?: never
	  }
	| {
			domain?: never
			proto: conform<basis, ProtoInput>
			unit?: never
	  }
	| {
			domain?: never
			proto?: never
			unit: conform<basis, UnitInput>
	  }

export type BasisedBranchInput<basis extends BasisInput = BasisInput> =
	IntersectionBasisInput<basis> &
		refinementInputsOf<parseBasis<basis>> &
		BaseAttributes

export type NarrowedBranchInput = {
	narrow?: inputOf<"narrow">
} & BaseAttributes

export type IntersectionInput<basis extends BasisInput = BasisInput> =
	| basis
	| NarrowedBranchInput
	| BasisedBranchInput<basis>

export type parseIntersection<input> = input extends IntersectionInput<
	infer basis
>
	? IntersectionNode<
			BasisInput extends basis ? unknown : parseBasis<basis>["infer"]
	  >
	: never

type exactBasisMessageOnError<branch extends BasisedBranchInput, expected> = {
	[k in keyof branch]: k extends keyof expected
		? branch[k]
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionInput<input> =
	input extends validateBasisInput<input>
		? input
		: input extends BasisedBranchInput<infer basis>
		? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
		: input extends NarrowedBranchInput
		? exactMessageOnError<input, NarrowedBranchInput>
		: IntersectionInput | MorphInput

export class IntersectionNode<t = unknown> extends TypeNode<
	t,
	IntersectionSchema
> {
	readonly kind = "intersection"

	inId = this.constraints.map((constraint) => constraint.inId).join("&")
	outId = this.constraints.map((constraint) => constraint.outId).join("&")
	typeId = this.constraints.map((constraint) => constraint.typeId).join("&")
	metaId = this.constraints.map((constraint) => constraint.metaId).join("&")

	protected constructor(schema: IntersectionSchema) {
		super(schema)
	}

	branches = [this]

	writeDefaultDescription() {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	// intersect(other: PredicateNode) {
	// 	const schema: Partial<PredicateSchema> = {}
	// 	if (this.morphs.length) {
	// 		if (other.morphs.length) {
	// 			if (!this.morphs.every((morph, i) => morph === other.morphs[i])) {
	// 				throw new Error(`Invalid intersection of morphs.`)
	// 			}
	// 		}
	// 		schema.morphs = this.morphs
	// 	} else if (other.morphs.length) {
	// 		schema.morphs = other.morphs
	// 	}
	// 	let constraints: readonly Constraint[] | Disjoint = this.constraints
	// 	if (this.typeId !== other.typeId) {
	// 		for (const constraint of other.constraints) {
	// 			if (constraints instanceof Disjoint) {
	// 				break
	// 			}
	// 			constraints = this.addConstraint(constraint)
	// 		}
	// 		if (constraints instanceof Disjoint) {
	// 			return constraints
	// 		}
	// 	}
	// 	schema.constraints = constraints
	// 	const typeId = hashPredicateType(schema as PredicateSchema)
	// 	if (typeId === this.typeId) {
	// 		if (this.schema.description) {
	// 			schema.description = this.schema.description
	// 		}
	// 		if (this.schema.alias) {
	// 			schema.alias = this.schema.alias
	// 		}
	// 	}
	// 	if (typeId === other.typeId) {
	// 		if (other.schema.description) {
	// 			schema.description = other.schema.description
	// 		}
	// 		if (other.schema.alias) {
	// 			schema.alias = other.schema.alias
	// 		}
	// 	}
	// 	return new PredicateNode(schema as PredicateSchema)
	// }

	protected addConstraint(
		constraint: ConstraintNode
	): readonly ConstraintNode[] | Disjoint {
		const result: ConstraintNode[] = []
		let includesConstraint = false
		for (let i = 0; i < this.constraints.length; i++) {
			const elementResult = constraint.intersectConstraint(this.constraints[i])
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
