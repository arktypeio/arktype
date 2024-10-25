import { printable, throwParseError } from "@ark/util"
import { type, type Out, type Type } from "arktype"
import { parseJsonSchemaAnyKeywords } from "./any.ts"
import { validateJsonSchemaArray } from "./array.ts"
import { parseJsonSchemaCompositionKeywords } from "./composition.ts"
import { validateJsonSchemaNumber } from "./number.ts"
import { validateJsonSchemaObject } from "./object.ts"
import { JsonSchema } from "./scope.ts"
import { validateJsonSchemaString } from "./string.ts"

export const innerParseJsonSchema: Type<
	(In: JsonSchema.Schema) => Out<Type<unknown, any>>
> = JsonSchema.Schema.pipe(
	(jsonSchema: JsonSchema.Schema): Type<unknown, any> => {
		if (typeof jsonSchema === "boolean") {
			if (jsonSchema) return JsonSchema.Json
			else return type("never") // No runtime value ever passes validation for JSON schema of 'false'
		}

		if (Array.isArray(jsonSchema)) {
			return (
				parseJsonSchemaCompositionKeywords({ anyOf: jsonSchema }) ??
				throwParseError(
					"Failed to convert root array of JSON Schemas to an anyOf schema"
				)
			)
		}

		const constAndOrEnumValidator = parseJsonSchemaAnyKeywords(jsonSchema)
		const compositionValidator = parseJsonSchemaCompositionKeywords(jsonSchema)

		const preTypeValidator: Type | undefined =
			constAndOrEnumValidator ?
				compositionValidator ? compositionValidator.and(constAndOrEnumValidator)
				:	constAndOrEnumValidator
			:	compositionValidator

		if ("type" in jsonSchema) {
			let typeValidator: Type
			switch (jsonSchema.type) {
				case "array":
					typeValidator = validateJsonSchemaArray.assert(jsonSchema)
					break
				case "boolean":
				case "null":
					typeValidator = type(jsonSchema.type)
					break
				case "integer":
				case "number":
					typeValidator = validateJsonSchemaNumber.assert(jsonSchema)
					break
				case "object":
					typeValidator = validateJsonSchemaObject.assert(jsonSchema)
					break
				case "string":
					typeValidator = validateJsonSchemaString.assert(jsonSchema)
					break
				default:
					throwParseError(
						// @ts-expect-error -- All valid 'type' values should be handled above
						`Provided 'type' value must be a supported JSON Schema type (was '${jsonSchema.type}')`
					)
			}
			if (preTypeValidator === undefined) return typeValidator
			return typeValidator.and(preTypeValidator)
		}
		if (preTypeValidator === undefined) {
			throwParseError(
				`Provided JSON Schema must have one of 'type', 'enum', 'const', 'allOf', 'anyOf' but was ${printable(jsonSchema)}.`
			)
		}
		return preTypeValidator
	}
)

export const parseJsonSchema = (jsonSchema: JsonSchema.Schema): Type<unknown> =>
	innerParseJsonSchema.assert(jsonSchema) as never
