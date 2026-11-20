import type { inferJsonSchema } from "arktype/internal/jsonSchema/infer.ts"
import type { validateJsonSchema } from "arktype/internal/jsonSchema/validate.ts"

// what fromJsonSchema checks and infers a JSON Schema with
export declare namespace jsonSchema {
	// read back with `infer` so a contextual type isn't inferred into it
	export type infer<schema, root = schema> =
		inferJsonSchema<schema, root> extends infer t ? t : never

	export type validate<schema, root = schema> = validateJsonSchema<schema, root>
}

// checks inference without reading the schema at runtime
// like fromJsonSchema, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
export const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

/** the element type `depth` levels into nested arrays */
export type elementAt<t, depth extends number, i extends 1[] = []> =
	i["length"] extends depth ? t
	: t extends readonly (infer element)[] ? elementAt<element, depth, [...i, 1]>
	: t
