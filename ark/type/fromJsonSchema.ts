import type { StandardJSONSchemaV1 } from "@ark/schema"
import { parse } from "arksets/internal"
import type { inferJsonSchema } from "./jsonSchema/infer.ts"
import type { validateJsonSchema } from "./jsonSchema/validate.ts"
import { type } from "./keywords/keywords.ts"
import type { Type } from "./type.ts"

/** a Standard Schema of any vendor, which is read only if it's a Standard JSON Schema */
export interface StandardSchemaLike {
	readonly "~standard": unknown
}

// a conditional rather than an overload for Standard Schemas: an overload
// costs fewer instantiations, but prefixes each error in a JSON Schema with
// "No overload matches this call" and accepts a Standard Schema without
// jsonSchema as a JSON Schema of unknown keywords
export type validateFromJsonSchema<schema> =
	schema extends StandardSchemaLike ? StandardJSONSchemaV1
	:	validateJsonSchema<schema>

export type inferFromJsonSchema<schema> =
	// a schema TypeScript can't see, like JSON.parse's any, may be anything
	0 extends 1 & schema ? unknown
	: schema extends StandardJSONSchemaV1 ?
		StandardJSONSchemaV1.InferInput<schema>
	:	inferJsonSchema<schema>

export type FromJsonSchema = <
	const schema,
	r = Type<inferFromJsonSchema<schema>>
>(
	schema: validateFromJsonSchema<schema>
) => r extends infer _ ? _ : never

/**
 * The Type of a JSON Schema (an object or a boolean) or a Standard JSON Schema
 * (e.g. a zod schema). A JSON Schema written as a literal is checked and its
 * type inferred; a Standard Schema is read as the JSON Schema of its input.
 * @throws {ParseError} for anything else, or a schema that can't be read exactly
 */
export const fromJsonSchema: FromJsonSchema = schema =>
	// the node is read in an isolated scope, so type() rebinds it to arktype's
	type(parse(schema as never) as never) as never
