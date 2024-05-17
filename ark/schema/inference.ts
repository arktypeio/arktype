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
import type { NodeSchema, Prerequisite } from "./kinds.js"
import type { BaseNode } from "./node.js"
import type { DomainSchema } from "./roots/domain.js"
import type { IntersectionSchema } from "./roots/intersection.js"
import type {
	Morph,
	MorphInputSchema,
	MorphSchema,
	Out,
	inferMorphOut
} from "./roots/morph.js"
import type { ProtoSchema } from "./roots/proto.js"
import type { NormalizedUnionSchema, UnionSchema } from "./roots/union.js"
import type { UnitSchema } from "./roots/unit.js"
import type { ArkErrors } from "./shared/errors.js"
import type { BasisKind, ConstraintKind } from "./shared/implement.js"
import type { inferred } from "./shared/utils.js"

export namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors
}

export type validateRoot<schema, $> =
	schema extends type.cast<unknown> ? schema
	: schema extends array ?
		{ [i in keyof schema]: validateRootBranch<schema[i], $> }
	: schema extends NormalizedUnionSchema<infer branches> ?
		conform<
			schema,
			NormalizedUnionSchema & {
				branches: {
					[i in keyof branches]: validateRootBranch<branches[i], $>
				}
			}
		>
	:	validateRootBranch<schema, $>

export type inferRoot<schema, $> =
	schema extends type.cast<infer to> ? to
	: schema extends UnionSchema<infer branches> ?
		branches["length"] extends 0 ? never
		: branches["length"] extends 1 ? inferRootBranch<branches[0], $>
		: inferRootBranch<branches[number], $>
	:	inferRootBranch<schema, $>

type validateRootBranch<schema, $> =
	schema extends BaseNode ? schema
	: "morphs" extends keyof schema ? validateMorphRoot<schema, $>
	: validateMorphChild<schema, $>

type inferRootBranch<schema, $> =
	schema extends type.cast<infer to> ? to
	: schema extends MorphSchema ?
		(
			In: schema["in"] extends {} ? inferMorphChild<schema["in"], $> : unknown
		) => schema["out"] extends {} ? Out<inferMorphChild<schema["out"], $>>
		: schema["morphs"] extends infer morph extends Morph ?
			Out<inferMorphOut<morph>>
		: schema["morphs"] extends (
			readonly [...unknown[], infer morph extends Morph]
		) ?
			Out<inferMorphOut<morph>>
		:	never
	: schema extends MorphInputSchema ? inferMorphChild<schema, $>
	: unknown

type NonIntersectableBasisRoot = NonEnumerableDomain | Constructor | UnitSchema

type validateMorphChild<schema, $> =
	[schema] extends [NonIntersectableBasisRoot] ? schema
	:	validateIntersectionRoot<schema, $>

type inferMorphChild<schema, $> =
	schema extends NonIntersectableBasisRoot ? inferBasis<schema, $>
	: schema extends IntersectionSchema ? inferBasisOf<schema, $>
	: unknown

type validateMorphRoot<schema, $> = {
	[k in keyof schema]: k extends "from" | "to" ?
		validateMorphChild<schema[k], $>
	: k extends keyof MorphSchema ? MorphSchema[k]
	: `'${k & string}' is not a valid morph schema key`
}

type exactBasisMessageOnError<schema, expected> = {
	[k in keyof schema]: k extends keyof expected ?
		conform<schema[k], expected[k]>
	:	ErrorMessage<
			k extends ConstraintKind ?
				`${k} has a prerequisite of ${describe<Prerequisite<k>>}`
			:	`'${k & string}' is not on an intersection schema`
		>
}

export type validateIntersectionRoot<schema, $> = exactBasisMessageOnError<
	schema,
	IntersectionSchema<inferBasisOf<schema, $>>
>

type inferBasisOf<schema, $> =
	"proto" extends keyof schema ?
		inferBasis<conform<schema["proto"], ProtoSchema>, $>
	: "domain" extends keyof schema ?
		inferBasis<conform<schema["domain"], DomainSchema>, $>
	:	unknown

// TODO: remove
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type inferBasis<schema extends NodeSchema<BasisKind>, $> =
	isAny<schema> extends (
		true //allow any to be used to access all constraints
	) ?
		any
	: schema extends NonEnumerableDomain ? inferDomain<schema>
	: schema extends Constructor<infer instance> ? instance
	: schema extends DomainSchema<infer domain> ? inferDomain<domain>
	: schema extends ProtoSchema<infer proto> ? instanceOf<proto>
	: schema extends UnitSchema<infer is> ? is
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
