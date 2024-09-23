import { rootSchema } from "@ark/schema"
import { throwParseError } from "@ark/util"
import type { Type } from "arktype"
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
		return rootSchema({ unit: jsonSchema.const }) as unknown as Type
	}

	if ("enum" in jsonSchema) {
		return rootSchema(
			jsonSchema.enum.map((unit: unknown) => ({
				unit
			}))
		) as unknown as Type
	}
}
