import { throwParseError } from "@ark/util"
import { type Type, type } from "arktype"
import type { JsonSchema } from "./scope.ts"

export const parseJsonSchemaAnyKeywords = (
	jsonSchema:
		| JsonSchema.TypeWithNoKeywords
		| JsonSchema.TypeWithKeywords
		| JsonSchema.AnyKeywords
		| JsonSchema.CompositionKeywords
): Type | undefined => {
	if ("const" in jsonSchema) {
		if ("enum" in jsonSchema) {
			throwParseError(
				"Provided JSON Schema cannot have both 'const' and 'enum' keywords."
			)
		}
		return type.unit(jsonSchema.const)
	}

	if ("enum" in jsonSchema) return type.enumerated(jsonSchema.enum)
}
