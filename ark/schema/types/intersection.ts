import type {
	AbstractableConstructor,
	conform,
	ErrorMessage,
	exactMessageOnError,
	listable
} from "@arktype/util"
import type { BasisKind, validateBasisInput } from "../constraints/basis.js"
import type { ConstraintKind } from "../constraints/constraint.js"
import type {
	DomainNode,
	DomainSchema,
	NonEnumerableDomain
} from "../constraints/domain.js"
import type { ProtoNode, ProtoSchema } from "../constraints/proto.js"
import type {
	RefinementIntersectionInput,
	RefinementKind
} from "../constraints/refinement.js"
import type { UnitNode, UnitSchema } from "../constraints/unit.js"
import type { BaseAttributes, Node, Schema } from "../node.js"
import type { MorphInput } from "./morph.js"
import { type IntersectionNode } from "./type.js"

export type AnyIntersectionChildren = BaseAttributes & {
	[k in ConstraintKind]?: listable<Node<k>>
}

export type parseBasis<input extends Schema<BasisKind>> =
	input extends DomainSchema<infer domain>
		? DomainNode<domain>
		: input extends ProtoSchema<infer proto>
		? ProtoNode<proto>
		: input extends UnitSchema<infer unit>
		? UnitNode<unit>
		: never

type basisOf<k extends RefinementKind> = Node<k>["applicableTo"] extends ((
	_: Node<BasisKind> | undefined
) => _ is infer basis extends Node<BasisKind> | undefined)
	? basis
	: never

type refinementKindOf<basis> = {
	[k in RefinementKind]: basis extends basisOf<k> ? k : never
}[RefinementKind]

export type refinementsOf<basis> = {
	[k in refinementKindOf<basis>]?: Node<k>
}

type refinementInputsOf<basis> = {
	[k in refinementKindOf<basis>]?: RefinementIntersectionInput<k>
}

type IntersectionBasisInputValue = Schema<BasisKind> | Node<BasisKind>

type IntersectionBasisInput<
	basis extends IntersectionBasisInputValue = IntersectionBasisInputValue
> =
	| {
			domain: conform<basis, DomainSchema | DomainNode>
			proto?: never
			unit?: never
	  }
	| {
			domain?: never
			proto: conform<basis, ProtoSchema | ProtoNode>
			unit?: never
	  }
	| {
			domain?: never
			proto?: never
			unit: conform<basis, UnitSchema | UnitNode>
	  }

export type BasisedBranchInput<
	basis extends IntersectionBasisInputValue = IntersectionBasisInputValue
> = IntersectionBasisInput<basis> &
	refinementInputsOf<parseBasis<basis>> &
	BaseAttributes

export type UnknownBranchInput = {
	predicates?: Schema<"predicate">
} & BaseAttributes

export type IntersectionSchema<
	basis extends IntersectionBasisInputValue = IntersectionBasisInputValue
> = basis | UnknownBranchInput | BasisedBranchInput<basis>

export type parseIntersection<input> = IntersectionNode<
	input extends AbstractableConstructor | NonEnumerableDomain
		? parseBasis<input>["infer"]
		: input extends IntersectionBasisInput<infer basis>
		? parseBasis<basis>["infer"]
		: unknown
>

type exactBasisMessageOnError<branch extends BasisedBranchInput, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionInput<input> =
	input extends validateBasisInput<input>
		? input
		: input extends IntersectionBasisInput<infer basis>
		? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
		: input extends UnknownBranchInput
		? exactMessageOnError<input, UnknownBranchInput>
		: IntersectionSchema | MorphInput

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
