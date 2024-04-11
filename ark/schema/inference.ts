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
import type { RawNode } from "./base.js"
import type { NodeDef, Prerequisite } from "./kinds.js"
import type { DomainDef } from "./schemas/domain.js"
import type { IntersectionDef } from "./schemas/intersection.js"
import type {
	Morph,
	MorphChildDefinition,
	MorphDef,
	Out,
	inferMorphOut
} from "./schemas/morph.js"
import type { ProtoDef } from "./schemas/proto.js"
import type { NormalizedUnionDef, UnionDef } from "./schemas/union.js"
import type { UnitDef } from "./schemas/unit.js"
import type { BasisKind, ConstraintKind } from "./shared/implement.js"
import type { inferred } from "./shared/utils.js"

export namespace type {
	export type cast<to = unknown> = {
		[inferred]?: to
	}
}

export type validateSchema<def, $> = def extends type.cast
	? def
	: def extends array
		? { [i in keyof def]: validateSchemaBranch<def[i], $> }
		: def extends NormalizedUnionDef<infer branches>
			? conform<
					def,
					NormalizedUnionDef & {
						branches: {
							[i in keyof branches]: validateSchemaBranch<
								branches[i],
								$
							>
						}
					}
				>
			: validateSchemaBranch<def, $>

export type inferSchema<def, $> = def extends type.cast<infer to>
	? to
	: def extends UnionDef<infer branches>
		? branches["length"] extends 0
			? never
			: branches["length"] extends 1
				? inferSchemaBranch<branches[0], $>
				: inferSchemaBranch<branches[number], $>
		: inferSchemaBranch<def, $>

type validateSchemaBranch<def, $> = def extends RawNode
	? def
	: keyof def & ("morph" | "in" | "out") extends never
		? validateMorphChild<def, $>
		: validateMorphSchema<def, $>

type inferSchemaBranch<def, $> = def extends type.cast<infer to>
	? to
	: def extends MorphDef
		? inferMorphSchema<def, $>
		: def extends MorphChildDefinition
			? inferMorphChild<def, $>
			: unknown

type NonIntersectableBasisSchema = NonEnumerableDomain | Constructor | UnitDef

type validateMorphChild<def, $> = [def] extends [NonIntersectableBasisSchema]
	? def
	: validateIntersectionSchema<def, $>

type inferMorphChild<def, $> = def extends NonIntersectableBasisSchema
	? inferBasis<def, $>
	: def extends IntersectionDef
		? inferBasisOf<def, $>
		: unknown

type validateMorphSchema<def, $> = {
	[k in keyof def]: k extends "in" | "out"
		? validateMorphChild<def[k], $>
		: k extends keyof MorphDef
			? MorphDef[k]
			: `'${k & string}' is not a valid morph schema key`
}

type inferMorphSchema<def extends MorphDef, $> = (
	In: def["in"] extends {} ? inferMorphChild<def["in"], $> : unknown
) => def["out"] extends {}
	? Out<inferMorphChild<def["out"], $>>
	: def["morphs"] extends infer morph extends Morph
		? Out<inferMorphOut<morph>>
		: def["morphs"] extends readonly [
					...unknown[],
					infer morph extends Morph
				]
			? Out<inferMorphOut<morph>>
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
	? inferBasis<conform<def["proto"], ProtoDef>, $>
	: "domain" extends keyof def
		? inferBasis<conform<def["domain"], DomainDef>, $>
		: unknown

export type inferBasis<
	def extends NodeDef<BasisKind>,
	$
> = isAny<def> extends true //allow any to be used to access all constraints
	? any
	: def extends NonEnumerableDomain
		? inferDomain<def>
		: def extends Constructor<infer instance>
			? instance
			: def extends DomainDef<infer domain>
				? inferDomain<domain>
				: def extends ProtoDef<infer proto>
					? instanceOf<proto>
					: def extends UnitDef<infer is>
						? is
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
