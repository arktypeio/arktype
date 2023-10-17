import type {
	AbstractableConstructor,
	conform,
	ErrorMessage,
	evaluate,
	exactMessageOnError
} from "@arktype/util"
import { basisClassesByKind, type BasisKind } from "../constraints/basis.js"
import { MaxNode, MinNode } from "../constraints/bounds.js"
import type { ConstraintKind } from "../constraints/constraint.js"
import { DivisorNode } from "../constraints/divisor.js"
import type {
	DomainNode,
	DomainSchema,
	NonEnumerableDomain
} from "../constraints/domain.js"
import { PatternNode } from "../constraints/pattern.js"
import { PredicateNode } from "../constraints/predicate.js"
import { PropNode } from "../constraints/prop.js"
import type { ProtoNode, ProtoSchema } from "../constraints/proto.js"
import type {
	RefinementIntersectionInput,
	RefinementKind
} from "../constraints/refinement.js"
import type {
	CollapsedUnitSchema,
	UnitNode,
	UnitSchema
} from "../constraints/unit.js"
import type { BaseAttributes, Node, NodeClass, Schema } from "../node.js"
import type { MorphSchema } from "./morph.js"
import { type IntersectionNode } from "./type.js"

export const reducibleChildClasses = {
	...basisClassesByKind,
	divisor: DivisorNode,
	max: MaxNode,
	min: MinNode
}

export const irreducibleChildClasses = {
	pattern: PatternNode,
	predicate: PredicateNode,
	prop: PropNode
}

export type IrreducibleConstraintKind = keyof typeof irreducibleChildClasses

export const intersectionChildClasses: { [k in ConstraintKind]: NodeClass<k> } =
	{
		...reducibleChildClasses,
		...irreducibleChildClasses
	}

export interface IntersectionChildren extends BaseAttributes {
	constraints: readonly Node<ConstraintKind>[]
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

type IntersectionBasisInputValue = Schema<BasisKind>

type IntersectionBasisInput<
	basis extends IntersectionBasisInputValue = IntersectionBasisInputValue
> =
	| {
			domain: conform<basis, DomainSchema>
			proto?: never
			unit?: never
	  }
	| {
			domain?: never
			proto: conform<basis, ProtoSchema>
			unit?: never
	  }
	| {
			domain?: never
			proto?: never
			unit: conform<basis, UnitSchema>
	  }

export type BasisedBranchInput<
	basis extends IntersectionBasisInputValue = IntersectionBasisInputValue
> = IntersectionBasisInput<basis> &
	refinementInputsOf<parseBasis<basis>> &
	BaseAttributes

export type UnknownBranchInput = {
	predicate?: RefinementIntersectionInput<"predicate">
} & BaseAttributes

export type IntersectionSchema<
	basis extends IntersectionBasisInputValue = IntersectionBasisInputValue
> = basis | UnknownBranchInput | BasisedBranchInput<basis>

export type parseIntersection<input> = input extends
	| AbstractableConstructor
	| NonEnumerableDomain
	? IntersectionNode<parseBasis<input>["infer"]>
	: input extends IntersectionBasisInput<infer basis>
	? IntersectionNode<parseBasis<basis>["infer"]>
	: IntersectionNode<unknown>

type exactBasisMessageOnError<branch extends BasisedBranchInput, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionInput<input> = input extends
	| NonEnumerableDomain
	| AbstractableConstructor
	? input
	: input extends CollapsedUnitSchema
	? exactMessageOnError<input, CollapsedUnitSchema>
	: input extends IntersectionBasisInput<infer basis>
	? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
	: input extends UnknownBranchInput
	? exactMessageOnError<input, UnknownBranchInput>
	: CollapsedUnitSchema | IntersectionSchema | MorphSchema

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

export const precedenceByConstraint: Record<ConstraintKind, number> = {
	// basis
	domain: 0,
	proto: 0,
	unit: 0,
	// shallow
	min: 1,
	max: 1,
	divisor: 1,
	pattern: 1,
	// deep
	prop: 2,
	// narrow
	predicate: 3
}
