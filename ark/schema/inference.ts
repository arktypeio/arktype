import type {
	Constructor,
	ErrorMessage,
	NonEnumerableDomain,
	array,
	conform,
	describe,
	inferDomain,
	instanceOf,
	isAny
} from "@arktype/util"
import type { NodeDef, Prerequisite } from "./kinds.js"
import type { BaseNode } from "./node.js"
import type { DomainDef } from "./roots/domain.js"
import type { IntersectionDef } from "./roots/intersection.js"
import type {
	Morph,
	MorphDef,
	MorphInputDef,
	Out,
	inferMorphOut
} from "./roots/morph.js"
import type { ProtoDef } from "./roots/proto.js"
import type { NormalizedUnionDef, UnionDef } from "./roots/union.js"
import type { UnitDef } from "./roots/unit.js"
import type { ArkErrors } from "./shared/errors.js"
import type { BasisKind, ConstraintKind } from "./shared/implement.js"
import type { inferred } from "./shared/utils.js"

export namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors
}

export type validateRoot<def, $> =
	def extends type.cast<unknown> ? def
	: def extends array ? { [i in keyof def]: validateRootBranch<def[i], $> }
	: def extends NormalizedUnionDef<infer branches> ?
		conform<
			def,
			NormalizedUnionDef & {
				branches: {
					[i in keyof branches]: validateRootBranch<branches[i], $>
				}
			}
		>
	:	validateRootBranch<def, $>

export type inferRoot<def, $> =
	def extends type.cast<infer to> ? to
	: def extends UnionDef<infer branches> ?
		branches["length"] extends 0 ? never
		: branches["length"] extends 1 ? inferRootBranch<branches[0], $>
		: inferRootBranch<branches[number], $>
	:	inferRootBranch<def, $>

type validateRootBranch<def, $> =
	def extends BaseNode ? def
	: "morphs" extends keyof def ? validateMorphRoot<def, $>
	: validateMorphChild<def, $>

type inferRootBranch<def, $> =
	def extends type.cast<infer to> ? to
	: def extends MorphDef ?
		(
			In: def["from"] extends {} ? inferMorphChild<def["from"], $> : unknown
		) => def["to"] extends {} ? Out<inferMorphChild<def["to"], $>>
		: def["morphs"] extends infer morph extends Morph ?
			Out<inferMorphOut<morph>>
		: def["morphs"] extends readonly [...unknown[], infer morph extends Morph] ?
			Out<inferMorphOut<morph>>
		:	never
	: def extends MorphInputDef ? inferMorphChild<def, $>
	: unknown

type NonIntersectableBasisRoot = NonEnumerableDomain | Constructor | UnitDef

type validateMorphChild<def, $> =
	[def] extends [NonIntersectableBasisRoot] ? def
	:	validateIntersectionRoot<def, $>

type inferMorphChild<def, $> =
	def extends NonIntersectableBasisRoot ? inferBasis<def, $>
	: def extends IntersectionDef ? inferBasisOf<def, $>
	: unknown

type validateMorphRoot<def, $> = {
	[k in keyof def]: k extends "from" | "to" ? validateMorphChild<def[k], $>
	: k extends keyof MorphDef ? MorphDef[k]
	: `'${k & string}' is not a valid morph schema key`
}

type exactBasisMessageOnError<def, expected> = {
	[k in keyof def]: k extends keyof expected ? conform<def[k], expected[k]>
	:	ErrorMessage<
			k extends ConstraintKind ?
				`${k} has a prerequisite of ${describe<Prerequisite<k>>}`
			:	`'${k & string}' is not on an intersection schema`
		>
}

export type validateIntersectionRoot<def, $> = exactBasisMessageOnError<
	def,
	IntersectionDef<inferBasisOf<def, $>>
>

type inferBasisOf<def, $> =
	"proto" extends keyof def ? inferBasis<conform<def["proto"], ProtoDef>, $>
	: "domain" extends keyof def ?
		inferBasis<conform<def["domain"], DomainDef>, $>
	:	unknown

// TODO: remove
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type inferBasis<def extends NodeDef<BasisKind>, $> =
	isAny<def> extends (
		true //allow any to be used to access all constraints
	) ?
		any
	: def extends NonEnumerableDomain ? inferDomain<def>
	: def extends Constructor<infer instance> ? instance
	: def extends DomainDef<infer domain> ? inferDomain<domain>
	: def extends ProtoDef<infer proto> ? instanceOf<proto>
	: def extends UnitDef<infer is> ? is
	: never

// export type inferPropsInput<input extends PropsInput> =
// 	input extends PropsInputTuple<infer named, infer indexed>
// 		? inferIndexed<indexed, inferNamedProps<named, indexed>>
// 		: input extends NamedPropsInput
// 		? inferNamedProps<input, []>
// 		: never

// type inferIndexed<
// 	indexed extends readonly IndexedPropInput[],
// 	result = unknown
// > = indexed extends readonly [
// 	infer entry extends IndexedPropInput,
// 	...infer tail extends IndexedPropInput[]
// ]
// 	? inferIndexed<
// 			tail,
// 			entry["key"] extends { readonly regex: VariadicIndexMatcherLiteral }
// 				? result extends List
// 					? [...result, ...inferTypeInput<entry["value"]>[]]
// 					: never
// 				: entry["key"] extends {
// 						readonly regex: NonVariadicIndexMatcherLiteral
// 				  }
// 				? inferTypeInput<entry["value"]>[]
// 				: Record<
// 						Extract<inferTypeInput<entry["key"]>, PropertyKey>,
// 						inferTypeInput<entry["value"]>
// 				  >
// 	  >
// 	: result

// type inferNamedProps<
// 	named extends NamedPropsInput,
// 	indexed extends readonly IndexedPropInput[]
// > = [named, indexed[0]["key"]] extends
// 	| [TupleLengthProps, unknown]
// 	| [unknown, { readonly regex: VariadicIndexMatcherLiteral }]
// 	? inferNonVariadicTupleProps<named> &
// 			inferObjectLiteralProps<Omit<named, "length" | NumberLiteral | number>>
// 	: inferObjectLiteralProps<named>

// type inferObjectLiteralProps<named extends NamedPropsInput> = {} extends named
// 	? unknown
// 	: evaluate<
// 			{
// 				[k in requiredKeyOf<named>]: inferPropValue<named[k]["value"]>
// 			} & {
// 				[k in optionalKeyOf<named>]?: inferPropValue<named[k]["value"]>
// 			}
// 	  >

// type inferPropValue<value extends PropValueInput> = value extends Thunk<
// 	infer ret
// >
// 	? inferResolvedPropValue<ret>
// 	: inferResolvedPropValue<value>

// type inferResolvedPropValue<value> = value extends TypeNode<infer t>
// 	? t
// 	: inferTypeInput<Extract<value, TypeInput>>

// type stringifiedNumericKeyOf<t> = `${Extract<keyof t, number | NumberLiteral>}`

// type inferNonVariadicTupleProps<
// 	named extends NamedPropsInput,
// 	result extends unknown[] = []
// > = `${result["length"]}` extends stringifiedNumericKeyOf<named>
// 	? inferNonVariadicTupleProps<
// 			named,
// 			[...result, inferPropValue<named[`${result["length"]}`]["value"]>]
// 	  >
// 	: result

// type TupleLengthProps<length extends number = number> = {
// 	readonly length: {
// 		readonly prerequisite: true
// 		readonly value: { readonly basis: readonly ["===", length] }
// 	}
// }
