import type {
	Constructor,
	ErrorMessage,
	NonEnumerableDomain,
	conform,
	describe,
	inferDomain
} from "@arktype/util"
import type { TypeSchema } from "./base.js"
import type { Prerequisite } from "./kinds.js"
import type { SchemaParseOptions } from "./parse.js"
import { Scope } from "./scope.js"
import type { ConstraintKind, TypeKind } from "./shared/implement.js"
import type { inferBasis } from "./types/basis.js"
import type { DomainSchema } from "./types/domain.js"
import type { IntersectionSchema } from "./types/intersection.js"
import type {
	Morph,
	MorphChildDefinition,
	MorphSchema,
	Out,
	inferMorphOut
} from "./types/morph.js"
import type { ProtoSchema } from "./types/proto.js"
import type { Type } from "./types/type.js"
import type { NormalizedUnionSchema } from "./types/union.js"
import type { UnitSchema } from "./types/unit.js"

export type SchemaParser<$> = <const schema extends TypeSchema>(
	schema: schema,
	opts?: TypeSchemaParseOptions
) => Type<inferSchema<schema>, $>

export interface TypeSchemaParseOptions extends SchemaParseOptions {
	root?: boolean
	allowedKinds?: readonly TypeKind[]
}

export const rootSchema: SchemaParser<{}> = (schema, opts) =>
	Scope.root.parseTypeSchema(schema, {
		...opts,
		root: true,
		prereduced: true
	}) as never

export type validateSchema<schema> = [schema] extends [
	readonly [...infer branches]
]
	? {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
	  }
	: "branches" extends keyof schema
	? conform<schema, NormalizedUnionSchema>
	: validateSchemaBranch<schema>

export type inferSchema<schema> = [schema] extends [
	readonly [...infer branches]
]
	? branches["length"] extends 0
		? never
		: inferSchemaBranch<branches[number]>
	: schema extends NormalizedUnionSchema
	? inferSchemaBranch<schema["branches"][number]>
	: inferSchemaBranch<schema>

export type validateSchemaBranch<schema> = keyof schema &
	("morph" | "in" | "out") extends never
	? validateMorphChild<schema>
	: validateMorphSchema<schema>

export type inferSchemaBranch<schema> = schema extends MorphSchema
	? inferMorphSchema<schema>
	: schema extends MorphChildDefinition
	? inferMorphChild<schema>
	: unknown

type NonIntersectableBasisSchema =
	| NonEnumerableDomain
	| Constructor
	| UnitSchema

export type validateMorphChild<schema> = [schema] extends [
	NonIntersectableBasisSchema
]
	? schema
	: validateIntersectionSchema<schema>

export type inferMorphChild<schema> = schema extends NonIntersectableBasisSchema
	? inferBasis<schema>
	: schema extends IntersectionSchema
	? inferBasisOf<schema>
	: unknown

export type validateMorphSchema<schema> = {
	[k in keyof schema]: k extends "in" | "out"
		? validateMorphChild<schema[k]>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type inferMorphSchema<schema> = schema extends MorphSchema
	? (
			In: schema["in"] extends {} ? inferMorphChild<schema["in"]> : unknown
	  ) => schema["out"] extends {}
			? Out<inferMorphChild<schema["out"]>>
			: schema["morph"] extends
					| Morph<any, infer o>
					| readonly [...unknown[], Morph<any, infer o>]
			? Out<inferMorphOut<o>>
			: never
	: never

type exactBasisMessageOnError<schema, expected> = {
	[k in keyof schema]: k extends keyof expected
		? conform<schema[k], expected[k]>
		: ErrorMessage<
				k extends ConstraintKind
					? `${k} has a prerequisite of ${describe<Prerequisite<k>>}`
					: `'${k & string}' is not on an intersection schema`
		  >
}

export type validateIntersectionSchema<schema> = exactBasisMessageOnError<
	schema,
	IntersectionSchema<inferBasisOf<schema>>
>

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

// type inferResolvedPropValue<value> = value extends Type<infer t>
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
