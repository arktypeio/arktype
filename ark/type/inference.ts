import type {
	Constructor,
	ErrorMessage,
	NonEnumerableDomain,
	conform,
	describe,
	inferDomain
} from "@arktype/util"
import type { Node } from "./base.js"
import type { Prerequisite } from "./kinds.js"
import type { ConstraintKind } from "./shared/implement.js"
import type { instantiateBasis } from "./types/basis.js"
import type { DomainSchema } from "./types/domain.js"
import type { IntersectionSchema } from "./types/intersection.js"
import type {
	Morph,
	MorphChildDefinition,
	MorphChildKind,
	MorphSchema,
	Out,
	inferMorphOut
} from "./types/morph.js"
import type { ProtoSchema } from "./types/proto.js"
import type { NormalizedUnionSchema } from "./types/union.js"
import type { UnitSchema } from "./types/unit.js"

export type validateSchema<schema, $, args> = "branches" extends keyof schema
	? conform<schema, NormalizedUnionSchema>
	: schema extends readonly [...infer branches]
	? {
			[i in keyof branches]: validateSchemaBranch<branches[i], $, args>
	  }
	: validateSchemaBranch<schema, $, args>

export type instantiateSchema<schema, $, args> =
	schema extends NormalizedUnionSchema
		? inferSchemaBranch<schema["branches"][number], $, args>
		: schema extends readonly [...infer branches]
		? inferSchemaBranch<branches[number], $, args>
		: inferSchemaBranch<schema, $, args>

export type validateSchemaBranch<def, $, args> = keyof def &
	("morph" | "in" | "out") extends never
	? validateMorphChild<def, $, args>
	: validateMorphSchema<def, $, args>

export type inferSchemaBranch<schema, $, args> = schema extends MorphSchema
	? instantiateMorphSchema<schema, $, args>
	: schema extends MorphChildDefinition
	? instantiateMorphChild<schema, $, args>
	: unknown

type NonIntersectableBasisSchema =
	| NonEnumerableDomain
	| Constructor
	| UnitSchema

export type validateMorphChild<def, $, args> = [def] extends [
	NonIntersectableBasisSchema
]
	? def
	: validateIntersectionSchema<def, $, args>

export type instantiateMorphChild<def, $, args> =
	def extends NonIntersectableBasisSchema
		? instantiateBasis<def>
		: def extends IntersectionSchema
		? inferBasisOf<def>
		: Node<MorphChildKind>

export type validateMorphSchema<def, $, args> = {
	[k in keyof def]: k extends "in" | "out"
		? validateMorphChild<def[k], $, args>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type instantiateMorphSchema<def, $, args> = def extends MorphSchema
	? (
			In: def["in"] extends {}
				? instantiateMorphChild<def["in"], $, args>
				: unknown
	  ) => def["out"] extends {}
			? Out<instantiateMorphChild<def["out"], $, args>>
			: def["morph"] extends
					| Morph<any, infer o>
					| readonly [...unknown[], Morph<any, infer o>]
			? Out<inferMorphOut<o>>
			: never
	: never

type exactBasisMessageOnError<def, expected> = {
	[k in keyof def]: k extends keyof expected
		? conform<def[k], expected[k]>
		: ErrorMessage<
				k extends ConstraintKind
					? `${k} has a prerequisite of ${describe<Prerequisite<k>>}`
					: `'${k & string}' is not on an intersection schema`
		  >
}

export type validateIntersectionSchema<schema, $, args> =
	exactBasisMessageOnError<schema, IntersectionSchema<inferBasisOf<schema>>>

type inferBasisOf<schema> = schema extends {
	proto: ProtoSchema<infer constructor>
}
	? InstanceType<constructor>
	: schema extends { domain: DomainSchema<infer constructor> }
	? inferDomain<constructor>
	: unknown

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
