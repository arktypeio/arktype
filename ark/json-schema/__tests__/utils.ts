import type { jsonSchema } from "@ark/json-schema"

// checks inference without reading the schema at runtime
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
export const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

/** the element type `depth` levels into nested arrays */
export type elementAt<t, depth extends number, i extends 1[] = []> =
	i["length"] extends depth ? t
	: t extends readonly (infer element)[] ? elementAt<element, depth, [...i, 1]>
	: t
