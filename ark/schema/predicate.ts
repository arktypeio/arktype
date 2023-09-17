import type { conform, extend, listable } from "@arktype/util"
import { Hkt, throwInternalError, transform } from "@arktype/util"
import type {
	BasesByKind,
	Basis,
	BasisClassesByKind,
	BasisInput,
	BasisKind
} from "./constraints/basis.js"
import type { Constraint } from "./constraints/constraint.js"
import type {
	Refinement,
	RefinementKind,
	RefinementsByKind
} from "./constraints/refinement.js"
import { Disjoint } from "./disjoint.js"
import type { TraversalState } from "./io/traverse.js"
import type {
	BaseAttributes,
	inputOf,
	Node,
	NodeKind,
	parseNode
} from "./schema.js"
import { BaseNode } from "./schema.js"

export type PredicateSchema<basis extends Basis = Basis> = BaseAttributes & {
	basis?: basis
	morphs: readonly Morph[]
	constraints: readonly Constraint[]
} & refinementsOf<Basis extends basis ? any : basis>

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
		_: Basis
	) => _ is infer basis extends Basis)
		? basis
		: never

type refinementKindOf<basis> = {
	[k in RefinementKind]: basis extends basisOf<k> ? k : never
}[RefinementKind]

type refinementsOf<basis> = {
	[k in refinementKindOf<basis>]?: Refinement<k>
}

type refinementInputsOf<basis> = {
	[k in refinementKindOf<basis>]?: inputOf<k>
}

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export interface PredicateAttributes extends BaseAttributes {
	morph?: listable<Morph>
}

export type PredicateInput<basis extends BasisInput = BasisInput> =
	| basis
	| Record<PropertyKey, never>
	| ({ narrow?: inputOf<"narrow"> } & PredicateAttributes)
	| ({ basis: basis } & refinementInputsOf<parseBasis<basis>> &
			PredicateAttributes)

export type parsePredicate<input extends PredicateInput> =
	input extends PredicateInput<infer basis>
		? PredicateNode<
				BasisInput extends basis ? unknown : parseBasis<basis>["infer"]
		  >
		: never

export class PredicateNode<t = unknown> extends BaseNode<PredicateSchema> {
	readonly kind = "predicate"
	declare infer: t

	declare constraints: Constraint[]
	readonly typeId = hashPredicateType(this.schema)

	protected constructor(schema: PredicateSchema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], PredicateInput>) =>
			new PredicateNode(input as never) as parsePredicate<typeof input>
	})()

	static from = <basis extends BasisInput>(input: PredicateInput<basis>) =>
		new PredicateNode<parseBasis<basis>["infer"]>({} as never)

	writeDefaultDescription() {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	allows() {
		return true
	}

	extractUnit() {
		// TODO: Fix
		return this.constraints.find((constraint) => constraint.kind === "unit") as
			| Node<"unit">
			| undefined
	}

	intersectAsymmetric(other: Node) {
		if (other.kind === "type") {
			return null
		}
		return [other as Node<Exclude<NodeKind, "type" | "predicate">>]
	}

	intersect(other: PredicateNode) {
		const schema: Partial<PredicateSchema> = {}
		if (this.morphs.length) {
			if (other.morphs.length) {
				if (!this.morphs.every((morph, i) => morph === other.morphs[i])) {
					throw new Error(`Invalid intersection of morphs.`)
				}
			}
			schema.morphs = this.morphs
		} else if (other.morphs.length) {
			schema.morphs = other.morphs
		}
		let constraints: readonly Constraint[] | Disjoint = this.constraints
		if (this.typeId !== other.typeId) {
			for (const constraint of other.constraints) {
				if (constraints instanceof Disjoint) {
					break
				}
				constraints = this.addConstraint(constraint)
			}
			if (constraints instanceof Disjoint) {
				return constraints
			}
		}
		schema.constraints = constraints
		const typeId = hashPredicateType(schema as PredicateSchema)
		if (typeId === this.typeId) {
			if (this.schema.description) {
				schema.description = this.schema.description
			}
			if (this.schema.alias) {
				schema.alias = this.schema.alias
			}
		}
		if (typeId === other.typeId) {
			if (other.schema.description) {
				schema.description = other.schema.description
			}
			if (other.schema.alias) {
				schema.alias = other.schema.alias
			}
		}
		return new PredicateNode(schema as PredicateSchema)
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
			const elementResult = constraint.intersect(this.constraints[i])
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

// TODO: cache
const hashPredicateType = (schema: Pick<PredicateSchema, "constraints">) =>
	schema.constraints.map((child) => child.hash()).join("")

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
