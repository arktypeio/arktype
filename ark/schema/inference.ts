import type {
	Constructor,
	ErrorMessage,
	Stringifiable,
	conform,
	exactMessageOnError
} from "@arktype/util"
import type { Node } from "./base.js"
import type { instantiateBasis } from "./bases/basis.js"
import type { NonEnumerableDomain } from "./bases/domain.js"
import type { isSchemaCast, schema } from "./keywords/keywords.js"
import type { IntersectionSchema } from "./sets/intersection.js"
import type {
	Morph,
	MorphSchema,
	Out,
	ValidatorDefinition,
	ValidatorKind,
	inferMorphOut
} from "./sets/morph.js"
import type { BranchNode, NormalizedUnionSchema } from "./sets/union.js"
import type { BasisKind, RefinementKind } from "./shared/define.js"
import type { Declaration, Schema } from "./shared/nodes.js"
import type { TypeNode } from "./type.js"

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

export type instantiateSchemaBranches<branches extends readonly unknown[]> =
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
	  : def extends ValidatorDefinition
	    ? instantiateMorphChild<def>
	    : BranchNode

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
	  : Node<ValidatorKind>

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
			? def["basis"] extends Schema<BasisKind>
				? def["basis"]
				: undefined
			: undefined
	>
>

export type instantiateIntersectionSchema<def> = "basis" extends keyof def
	? def["basis"] extends Schema<BasisKind>
		? keyof def & RefinementKind extends never
			? instantiateBasis<def["basis"]>
			: TypeNode<instantiateBasis<def["basis"]>["infer"], "intersection">
		: Node<"intersection">
	: Node<"intersection">
