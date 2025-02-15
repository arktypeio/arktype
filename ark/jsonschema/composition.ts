import { printable } from "@ark/util"
import { type, type JsonSchema, type Type } from "arktype"
import { parseJsonSchema } from "./json.ts"

const validateAllOfJsonSchemas = (jsonSchemas: readonly JsonSchema[]): Type =>
	jsonSchemas
		.map(jsonSchema => parseJsonSchema(jsonSchema))
		.reduce((acc, validator) => acc.and(validator))

const validateAnyOfJsonSchemas = (jsonSchemas: readonly JsonSchema[]): Type =>
	jsonSchemas
		.map(jsonSchema => parseJsonSchema(jsonSchema))
		.reduce((acc, validator) => acc.or(validator))

const validateNotJsonSchema = (jsonSchema: JsonSchema) => {
	const inner = parseJsonSchema(jsonSchema)
	return type.unknown.narrow((data, ctx) =>
		inner.allows(data) ?
			ctx.reject({
				expected: `a value that's not ${inner.description}`,
				actual: printable(data)
			})
		:	true
	) as Type
}

const validateOneOfJsonSchemas = (jsonSchemas: readonly JsonSchema[]) => {
	const oneOfValidators = jsonSchemas.map(nestedSchema =>
		parseJsonSchema(nestedSchema)
	)
	const oneOfValidatorsDescriptions = oneOfValidators.map(
		validator => `○ ${validator.description}`
	)
	return type.unknown.narrow((data, ctx) => {
		let matchedValidator: Type | undefined = undefined

		for (const validator of oneOfValidators) {
			if (validator.allows(data)) {
				if (matchedValidator === undefined) {
					matchedValidator = validator
					continue
				}
				return ctx.reject({
					expected: `exactly one of:\n${oneOfValidatorsDescriptions.join("\n")}`,
					actual: printable(data)
				})
			}
		}
		return matchedValidator !== undefined
	})
}

export const parseJsonSchemaCompositionKeywords = (
	jsonSchema: JsonSchema
): Type | undefined => {
	if ("allOf" in jsonSchema) return validateAllOfJsonSchemas(jsonSchema.allOf)
	if ("anyOf" in jsonSchema) return validateAnyOfJsonSchemas(jsonSchema.anyOf)
	if ("not" in jsonSchema) return validateNotJsonSchema(jsonSchema.not)
	if ("oneOf" in jsonSchema) return validateOneOfJsonSchemas(jsonSchema.oneOf)
}
