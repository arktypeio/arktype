import type {
	Constructor,
	ErrorMessage,
	conform,
	exactMessageOnError
} from "@arktype/util"
import type { Node } from "./base.js"
import type { instantiateBasis } from "./bases/basis.js"
import type { NonEnumerableDomain } from "./bases/domain.js"
import type { isCast, schema } from "./builtins/ark.js"
import type { Schema } from "./schema.js"
import type { IntersectionDefinition } from "./sets/intersection.js"
import type {
	Morph,
	MorphDefinition,
	Out,
	ValidatorDefinition,
	ValidatorKind,
	inferMorphOut
} from "./sets/morph.js"
import type { BranchNode } from "./sets/union.js"
import type { BasisKind, RefinementKind, SchemaKind } from "./shared/define.js"
import type { Definition, NormalizedDefinition } from "./shared/nodes.js"

export type validateAliases<aliases> = {
	[k in keyof aliases]: "branches" extends keyof aliases[k]
		? conform<aliases[k], NormalizedDefinition<"union">>
		: aliases[k] extends readonly [...infer branches]
		  ? {
					[i in keyof branches]: validateSchemaBranch<branches[i], aliases>
		    }
		  : validateSchemaBranch<aliases[k], aliases>
}

export type inferAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends NormalizedDefinition<"union">
		? instantiateSchemaBranches<aliases[k]["branches"]>
		: aliases[k] extends readonly [...infer branches]
		  ? instantiateSchemaBranches<branches>
		  : instantiateSchemaBranch<aliases[k]>
} & unknown

export type validateSchemaBranch<def, $> = isCast<def> extends true
	? def
	: "morph" extends keyof def
	  ? validateMorphSchema<def>
	  : validateValidatorSchema<def>

export type instantiateSchemaBranches<branches extends readonly unknown[]> =
	branches["length"] extends 0
		? Node<"union", never>
		: branches["length"] extends 1
		  ? instantiateSchemaBranch<branches[0]>
		  : Node<SchemaKind, instantiateSchemaBranch<branches[number]>["infer"]>

export type instantiateSchemaBranch<def> = isCast<def> extends true
	? def extends schema.cast<infer to, infer kind>
		? Schema<kind, to>
		: never
	: def extends MorphDefinition
	  ? parseMorphSchema<def>
	  : def extends ValidatorDefinition
	    ? instantiateValidatorSchema<def>
	    : BranchNode

export type validateValidatorSchema<def> = [def] extends [
	NonEnumerableDomain | Constructor
]
	? def
	: def extends { domain: unknown } | { proto: unknown } | { is: unknown }
	  ? exactMessageOnError<def, NormalizedDefinition<keyof def & BasisKind>>
	  : validateIntersectionSchema<def>

export type instantiateValidatorSchema<def> = def extends Definition<BasisKind>
	? instantiateBasis<def>
	: def extends IntersectionDefinition
	  ? instantiateIntersectionSchema<def>
	  : Node<ValidatorKind>

export type validateMorphSchema<def> = {
	[k in keyof def]: k extends "in" | "out"
		? validateValidatorSchema<def[k]>
		: k extends keyof MorphDefinition
		  ? MorphDefinition[k]
		  : `'${k & string}' is not a valid morph schema key`
}

export type parseMorphSchema<def> = def extends MorphDefinition
	? Node<
			"morph",
			(
				In: def["in"] extends {}
					? instantiateValidatorSchema<def["in"]>["infer"]
					: unknown
			) => def["out"] extends {}
				? Out<instantiateValidatorSchema<def["out"]>["infer"]>
				: def["morph"] extends
							| Morph<any, infer o>
							| readonly [...unknown[], Morph<any, infer o>]
				  ? Out<inferMorphOut<o>>
				  : never
	  >
	: never

export type IntersectionBasis = {
	basis: Definition<BasisKind>
}
type exactBasisMessageOnError<branch, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionSchema<def> = def extends IntersectionBasis
	? exactBasisMessageOnError<def, IntersectionDefinition<def["basis"]>>
	: exactBasisMessageOnError<def, IntersectionDefinition<undefined>>

export type instantiateIntersectionSchema<def> =
	def extends Required<IntersectionBasis>
		? keyof def & RefinementKind extends never
			? instantiateBasis<def["basis"]>
			: Node<"intersection", instantiateBasis<def["basis"]>["infer"]>
		: Node<"intersection">
