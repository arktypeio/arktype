import { rootSchema, type Intersection } from "@ark/schema"
import type { Type, string } from "arktype"
import { JsonSchema } from "./scope.js"

export const validateJsonSchemaString = JsonSchema.StringSchema.pipe(
	jsonSchema => {
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
		return rootSchema(arktypeStringSchema) as unknown as Type<string>
	}
)

export type inferJsonSchemaString<stringSchema, T = string> =
	"maxLength" extends keyof stringSchema ?
		inferJsonSchemaString<
			Omit<stringSchema, "maxLength">,
			T & string.atMostLength<stringSchema["maxLength"]>
		>
	: "minLength" extends keyof stringSchema ?
		inferJsonSchemaString<
			Omit<stringSchema, "minLength">,
			T & string.atLeastLength<stringSchema["minLength"]>
		>
	: "pattern" extends keyof stringSchema ?
		inferJsonSchemaString<
			Omit<stringSchema, "pattern">,
			T & string.matching<stringSchema["pattern"]>
		>
	:	T
