import type {
	Constructor,
	ErrorMessage,
	List,
	NonEnumerableDomain,
	Stringifiable,
	conform,
	exactMessageOnError
} from "@arktype/util"
import type { Node, TypeNode } from "./base.js"
import type { isSchemaCast, schema } from "./keywords/keywords.js"
import type { Declaration, Schema } from "./kinds.js"
import type { BasisKind, NodeKind } from "./shared/implement.js"
import type { instantiateBasis } from "./types/basis.js"
import type {
	IntersectionBasisKind,
	IntersectionSchema
} from "./types/intersection.js"
import type {
	Morph,
	MorphChildDefinition,
	MorphChildKind,
	MorphSchema,
	Out,
	inferMorphOut
} from "./types/morph.js"
import type { NormalizedUnionSchema, UnionChildNode } from "./types/union.js"

export type validateAliases<aliases> = {
	[k in keyof aliases]: "branches" extends keyof aliases[k]
		? conform<aliases[k], NormalizedUnionSchema>
		: aliases[k] extends readonly [...infer branches]
		? {
				[i in keyof branches]: validateSchemaBranch<branches[i], aliases>
		  }
		: validateSchemaBranch<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: isSchemaCast<aliases[k]> extends true
		? aliases[k] extends schema.cast<infer to, infer kind>
			? TypeNode<to, kind>
			: never
		: aliases[k] extends NormalizedUnionSchema
		? instantiateSchemaBranches<aliases[k]["branches"]>
		: aliases[k] extends readonly [...infer branches]
		? instantiateSchemaBranches<branches>
		: instantiateSchemaBranch<aliases[k]>
} & unknown

export type validateSchemaBranch<def, $> = isSchemaCast<def> extends true
	? def
	: keyof def & ("morph" | "in" | "out") extends never
	? validateMorphChild<def>
	: validateMorphSchema<def>

export type instantiateSchemaBranches<branches extends List> =
	branches["length"] extends 0
		? TypeNode<never, "union">
		: branches["length"] extends 1
		? instantiateSchemaBranch<branches[0]>
		: TypeNode<instantiateSchemaBranch<branches[number]>["infer"]>

export type instantiateSchemaBranch<def> = isSchemaCast<def> extends true
	? def extends schema.cast<infer to, infer kind>
		? TypeNode<to, kind>
		: never
	: def extends MorphSchema
	? instantiateMorphSchema<def>
	: def extends MorphChildDefinition
	? instantiateMorphChild<def>
	: UnionChildNode

export type validateMorphChild<def> = [def] extends [
	NonEnumerableDomain | Constructor
]
	? def
	: keyof def & BasisKind extends never
	? validateIntersectionSchema<def>
	: exactMessageOnError<
			def & object,
			Declaration<keyof def & BasisKind>["normalizedSchema"]
	  >

export type instantiateMorphChild<def> = def extends Schema<BasisKind>
	? instantiateBasis<def>
	: def extends IntersectionSchema
	? instantiateIntersectionSchema<def>
	: Node<MorphChildKind>

export type validateMorphSchema<def> = {
	[k in keyof def]: k extends "in" | "out"
		? validateMorphChild<def[k]>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type instantiateMorphSchema<def> = def extends MorphSchema
	? TypeNode<
			(
				In: def["in"] extends {}
					? instantiateMorphChild<def["in"]>["infer"]
					: unknown
			) => def["out"] extends {}
				? Out<instantiateMorphChild<def["out"]>["infer"]>
				: def["morph"] extends
						| Morph<any, infer o>
						| readonly [...unknown[], Morph<any, infer o>]
				? Out<inferMorphOut<o>>
				: never,
			"morph"
	  >
	: never

type basisToString<def> = "basis" extends keyof def
	? def["basis"] extends Stringifiable
		? `basis '${def["basis"]}'`
		: "this schema's basis"
	: "this schema's basis"

type exactBasisMessageOnError<def, expected> = {
	[k in keyof def]: k extends keyof expected
		? conform<def[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${basisToString<def>}`>
}

export type validateIntersectionSchema<def> = exactBasisMessageOnError<
	def,
	IntersectionSchema<
		"basis" extends keyof def
			? def["basis"] extends Schema<IntersectionBasisKind>
				? def["basis"]
				: undefined
			: undefined
	>
>

export type instantiateIntersectionSchema<def> = "basis" extends keyof def
	? def["basis"] extends Schema<BasisKind>
		? keyof def & NodeKind extends never
			? instantiateBasis<def["basis"]>
			: TypeNode<instantiateBasis<def["basis"]>["infer"], "intersection">
		: Node<"intersection">
	: Node<"intersection">

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
