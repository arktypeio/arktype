import type {
	Constructor,
	ErrorMessage,
	List,
	NonEnumerableDomain,
	conform,
	describe,
	inferDomain,
	instanceOf,
	isAny
} from "@arktype/util"
import type { Node, UnknownNode } from "./base.js"
import type { Prerequisite, Schema, reducibleKindOf } from "./kinds.js"
import type { Scope } from "./scope.js"
import type { BasisKind, ConstraintKind } from "./shared/implement.js"
import type { DomainNode, DomainSchema } from "./types/domain.js"
import type {
	IntersectionNode,
	IntersectionSchema
} from "./types/intersection.js"
import type {
	Morph,
	MorphChildDefinition,
	MorphChildKind,
	MorphNode,
	MorphSchema,
	Out,
	inferMorphOut
} from "./types/morph.js"
import type { ProtoNode, ProtoSchema } from "./types/proto.js"
import type {
	NormalizedUnionSchema,
	UnionChildNode,
	UnionNode,
	UnionSchema
} from "./types/union.js"
import type { UnitNode, UnitSchema } from "./types/unit.js"

export type SchemaParser<$> = <schema>(
	schema: validateSchema<schema, $>
) => ["schema", schema]

export declare const createSchemaParser: <$>($: Scope) => SchemaParser<$>

export type validateSchema<schema, $> = schema extends UnknownNode
	? schema
	: schema extends List
	? { [i in keyof schema]: validateSchemaBranch<schema[i], $> }
	: schema extends NormalizedUnionSchema<infer branches>
	? conform<
			schema,
			NormalizedUnionSchema & {
				branches: {
					[i in keyof branches]: validateSchemaBranch<branches[i], $>
				}
			}
	  >
	: validateSchemaBranch<schema, $>

export type instantiateSchema<schema, $> = schema extends UnionSchema<
	infer branches
>
	? branches["length"] extends 0
		? UnionNode<never, "union">
		: branches["length"] extends 1
		? instantiateSchemaBranch<branches[0], $>
		: Node<
				reducibleKindOf<"union">,
				instantiateSchemaBranch<branches[number], $>["infer"]
		  >
	: instantiateSchemaBranch<schema, $>

type validateSchemaBranch<schema, $> = schema extends UnknownNode
	? schema
	: keyof schema & ("morph" | "in" | "out") extends never
	? validateMorphChild<schema, $>
	: validateMorphSchema<schema, $>

type instantiateSchemaBranch<schema, $> = schema extends UnknownNode
	? schema
	: schema extends MorphSchema
	? instantiateMorphSchema<schema, $>
	: schema extends MorphChildDefinition
	? instantiateMorphChild<schema, $>
	: UnionChildNode

type NonIntersectableBasisSchema =
	| NonEnumerableDomain
	| Constructor
	| UnitSchema

type validateMorphChild<schema, $> = [schema] extends [
	NonIntersectableBasisSchema
]
	? schema
	: validateIntersectionSchema<schema, $>

type instantiateMorphChild<schema, $> =
	schema extends NonIntersectableBasisSchema
		? instantiateBasis<schema, $>
		: schema extends IntersectionSchema
		? instantiateIntersectionSchema<schema, $>
		: Node<MorphChildKind>

type validateMorphSchema<def, $> = {
	[k in keyof def]: k extends "in" | "out"
		? validateMorphChild<def[k], $>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

type instantiateMorphSchema<schema, $> = schema extends MorphSchema
	? MorphNode<
			(
				In: schema["in"] extends {}
					? instantiateMorphChild<schema["in"], $>["infer"]
					: unknown
			) => schema["out"] extends {}
				? Out<instantiateMorphChild<schema["out"], $>["infer"]>
				: schema["morphs"] extends
						| Morph<any, infer o>
						| readonly [...unknown[], Morph<any, infer o>]
				? Out<inferMorphOut<o>>
				: never
	  >
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

export type validateIntersectionSchema<schema, $> = exactBasisMessageOnError<
	schema,
	IntersectionSchema<inferBasisOf<schema, $>>
>

type inferBasisOf<schema, $> = "proto" extends keyof schema
	? instantiateBasis<conform<schema["proto"], ProtoSchema>, $>["infer"]
	: "domain" extends keyof schema
	? instantiateBasis<conform<schema["domain"], DomainSchema>, $>["infer"]
	: unknown

export type instantiateIntersectionSchema<schema, $> = keyof schema &
	ConstraintKind extends never
	? "proto" extends keyof schema
		? ProtoNode<inferBasisOf<schema, $>, $>
		: "domain" extends keyof schema
		? DomainNode<inferBasisOf<schema, $>, $>
		: IntersectionNode
	: IntersectionNode<inferBasisOf<schema, $>, $>

export type instantiateBasis<schema extends Schema<BasisKind>, $> =
	//allow any to be used to access all constraints
	isAny<schema> extends true
		? any
		: schema extends NonEnumerableDomain
		? DomainNode<inferDomain<schema>, $>
		: schema extends Constructor<infer instance>
		? ProtoNode<instance, $>
		: schema extends DomainSchema<infer domain>
		? DomainNode<inferDomain<domain>, $>
		: schema extends ProtoSchema<infer proto>
		? ProtoNode<instanceOf<proto>, $>
		: schema extends UnitSchema<infer is>
		? UnitNode<is, $>
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
