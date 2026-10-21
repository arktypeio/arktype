import type { inferJsonSchema } from "./infer.ts"
import type { validateJsonSchema } from "./validate.ts"

// a spread doesn't copy a class's getters or private members, so a schema
// spread into another can't carry its inferred type along, and the private
// member keeps a schema with its own `infer` keyword from matching
export declare class InferredJsonSchema<out t = unknown> {
	// eslint-disable-next-line no-unused-private-class-members
	#inferred: t
	get infer(): t
}

export interface JsonSchemaParser {
	<const schema, r = jsonSchema<inferJsonSchema<schema>, schema>>(
		schema: jsonSchema.validate<schema>
	): r extends infer _ ? _ : never

	as: <t = unknown>(schema: object | boolean) => jsonSchema<t>
}

export const jsonSchema: JsonSchemaParser = (schema =>
	schema) as JsonSchemaParser

Object.assign(jsonSchema, { as: jsonSchema })

export type jsonSchema<t = unknown, schema = unknown> = omitInfer<schema> &
	InferredJsonSchema<t>

// a schema's own `infer` keyword would intersect into the getter, which is
// all a published declaration's brand infers from
export type omitInfer<schema> =
	schema extends { infer: unknown } ? Omit<schema, "infer"> : schema

export declare namespace jsonSchema {
	// as a wrapper's return type, a contextual type is otherwise inferred
	// through every conditional type of the inference
	export type infer<schema, root = schema> =
		inferJsonSchema<schema, root> extends infer t ? t : never

	export type validate<schema, root = schema> = validateJsonSchema<schema, root>
}
