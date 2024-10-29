import { rootSchema, type Intersection } from "@ark/schema"
import type { Out, Type } from "arktype"
import { JsonSchema } from "./scope.ts"

export const validateJsonSchemaString: Type<
	(In: JsonSchema.StringSchema) => Out<Type<string, any>>,
	any
> = JsonSchema.StringSchema.pipe((jsonSchema): Type<string> => {
	const arktypeStringSchema: Intersection.Schema<string> = {
		domain: "string"
	}

	if ("maxLength" in jsonSchema)
		arktypeStringSchema.maxLength = jsonSchema.maxLength
	if ("minLength" in jsonSchema)
		arktypeStringSchema.minLength = jsonSchema.minLength
	if ("pattern" in jsonSchema) {
		if (jsonSchema.pattern instanceof RegExp) {
			arktypeStringSchema.pattern = [
				// Strip leading and trailing slashes from RegExp
				jsonSchema.pattern.toString().slice(1, -1)
			]
		} else arktypeStringSchema.pattern = [jsonSchema.pattern]
	}
	return rootSchema(arktypeStringSchema) as never
})