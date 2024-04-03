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
import type { Node, SchemaDef, SchemaNode, UnknownNode } from "../base.js"
import type { NodeDef, Prerequisite, reducibleKindOf } from "../kinds.js"
import type { DomainDef, DomainNode } from "../schemas/domain.js"
import type {
	IntersectionDef,
	IntersectionNode
} from "../schemas/intersection.js"
import type {
	Morph,
	MorphChildDefinition,
	MorphChildKind,
	MorphDef,
	MorphNode,
	Out,
	inferMorphOut
} from "../schemas/morph.js"
import type { ProtoDef, ProtoNode } from "../schemas/proto.js"
import type {
	NormalizedUnionDef,
	UnionChildNode,
	UnionDef,
	UnionNode
} from "../schemas/union.js"
import type { UnitDef, UnitNode } from "../schemas/unit.js"
import type {
	BasisKind,
	ConstraintKind,
	NodeKind
} from "../shared/implement.js"
import type { inferred } from "../shared/utils.js"
import type { SchemaParseOptions } from "./parse.js"

export namespace type {
	export type cast<to = unknown> = {
		[inferred]?: to
	}
}

export type UnitsParser = <const branches extends array>(
	...values: branches
) => branches["length"] extends 1
	? UnionNode<branches[0]>
	: UnionNode<branches[number]> | UnitNode<branches[number]>

export type SchemaParser<$> = <const schema extends SchemaDef>(
	schema: schema
) => schema

export type NodeParser<$> = <
	kind extends NodeKind,
	const schema extends NodeDef<kind>
>(
	kinds: kind,
	schema: schema,
	opts?: SchemaParseOptions
) => Node<reducibleKindOf<kind>>

export type RootParser<$> = <const schema extends SchemaDef>(
	schema: schema,
	opts?: SchemaParseOptions
) => instantiateSchema<schema, $>

export type validateSchema<def, $> = def extends type.cast
	? def
	: def extends array
	? { [i in keyof def]: validateSchemaBranch<def[i], $> }
	: def extends NormalizedUnionDef<infer branches>
	? conform<
			def,
			NormalizedUnionDef & {
				branches: {
					[i in keyof branches]: validateSchemaBranch<branches[i], $>
				}
			}
	  >
	: validateSchemaBranch<def, $>

export type instantiateSchema<def, $> = def extends type.cast<infer to>
	? SchemaNode<to>
	: def extends UnionDef<infer branches>
	? branches["length"] extends 0
		? UnionNode<never>
		: branches["length"] extends 1
		? instantiateSchemaBranch<branches[0], $>
		: Node<
				reducibleKindOf<"union">,
				instantiateSchemaBranch<branches[number], $>["infer"]
		  >
	: instantiateSchemaBranch<def, $>

type validateSchemaBranch<def, $> = def extends UnknownNode
	? def
	: keyof def & ("morph" | "in" | "out") extends never
	? validateMorphChild<def, $>
	: validateMorphSchema<def, $>

type instantiateSchemaBranch<def, $> = def extends UnknownNode
	? def
	: def extends MorphDef
	? instantiateMorphSchema<def, $>
	: def extends MorphChildDefinition
	? instantiateMorphChild<def, $>
	: UnionChildNode

type NonIntersectableBasisSchema = NonEnumerableDomain | Constructor | UnitDef

type validateMorphChild<def, $> = [def] extends [NonIntersectableBasisSchema]
	? def
	: validateIntersectionSchema<def, $>

type instantiateMorphChild<def, $> = def extends NonIntersectableBasisSchema
	? instantiateBasis<def, $>
	: def extends IntersectionDef
	? instantiateIntersectionSchema<def, $>
	: Node<MorphChildKind>

type validateMorphSchema<def, $> = {
	[k in keyof def]: k extends "in" | "out"
		? validateMorphChild<def[k], $>
		: k extends keyof MorphDef
		? MorphDef[k]
		: `'${k & string}' is not a valid morph schema key`
}

type instantiateMorphSchema<def, $> = def extends MorphDef
	? MorphNode<
			(
				In: def["in"] extends {}
					? instantiateMorphChild<def["in"], $>["infer"]
					: unknown
			) => def["out"] extends {}
				? Out<instantiateMorphChild<def["out"], $>["infer"]>
				: def["morphs"] extends infer morph extends Morph
				? Out<inferMorphOut<morph>>
				: def["morphs"] extends readonly [
						...unknown[],
						infer morph extends Morph
				  ]
				? Out<inferMorphOut<morph>>
				: never
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

export type validateIntersectionSchema<def, $> = exactBasisMessageOnError<
	def,
	IntersectionDef<inferBasisOf<def, $>>
>

type inferBasisOf<def, $> = "proto" extends keyof def
	? instantiateBasis<conform<def["proto"], ProtoDef>, $>["infer"]
	: "domain" extends keyof def
	? instantiateBasis<conform<def["domain"], DomainDef>, $>["infer"]
	: unknown

export type instantiateIntersectionSchema<def, $> = keyof def &
	ConstraintKind extends never
	? "proto" extends keyof def
		? ProtoNode<inferBasisOf<def, $>>
		: "domain" extends keyof def
		? DomainNode<inferBasisOf<def, $>>
		: IntersectionNode
	: IntersectionNode<inferBasisOf<def, $>>

export type instantiateBasis<def extends NodeDef<BasisKind>, $> =
	//allow any to be used to access all constraints
	isAny<def> extends true
		? any
		: def extends NonEnumerableDomain
		? DomainNode<inferDomain<def>>
		: def extends Constructor<infer instance>
		? ProtoNode<instance>
		: def extends DomainDef<infer domain>
		? DomainNode<inferDomain<domain>>
		: def extends ProtoDef<infer proto>
		? ProtoNode<instanceOf<proto>>
		: def extends UnitDef<infer is>
		? UnitNode<is>
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
