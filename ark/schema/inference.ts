import type {
	Constructor,
	ErrorMessage,
	List,
	NonEnumerableDomain,
	conform,
	describe
} from "@arktype/util"
import type { Node, TypeNode } from "./base.js"
import type { isSchemaCast, schema } from "./keywords/keywords.js"
import type { Prerequisite } from "./kinds.js"
import type { ConstraintKind } from "./shared/implement.js"
import type { instantiateBasis } from "./types/basis.js"
import type { DomainNode, DomainSchema } from "./types/domain.js"
import type {
	IntersectionNode,
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
import type { ProtoNode, ProtoSchema } from "./types/proto.js"
import type { NormalizedUnionSchema, UnionChildNode } from "./types/union.js"
import type { UnitSchema } from "./types/unit.js"

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

type NonIntersectableBasisSchema =
	| NonEnumerableDomain
	| Constructor
	| UnitSchema

export type validateMorphChild<def> = [def] extends [
	NonIntersectableBasisSchema
]
	? def
	: validateIntersectionSchema<def>

export type instantiateMorphChild<def> = def extends NonIntersectableBasisSchema
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

type exactBasisMessageOnError<def, expected> = {
	[k in keyof def]: k extends keyof expected
		? conform<def[k], expected[k]>
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

type inferBasisOf<schema> = "proto" extends keyof schema
	? instantiateBasis<conform<schema["proto"], ProtoSchema>>["infer"]
	: "domain" extends keyof schema
	? instantiateBasis<conform<schema["domain"], DomainSchema>>["infer"]
	: unknown

export type instantiateIntersectionSchema<def> = keyof def &
	ConstraintKind extends never
	? "proto" extends keyof def
		? ProtoNode<inferBasisOf<def>>
		: "domain" extends keyof def
		? DomainNode<inferBasisOf<def>>
		: IntersectionNode
	: IntersectionNode<inferBasisOf<def>>

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
