import { type, type Type } from "arktype"
import { parseJsonSchema } from "./json.ts"
import type { JsonSchema } from "./scope.ts"

const validateAllOfJsonSchemas = (
	jsonSchemas: JsonSchema.Schema[]
): Type<unknown> =>
	jsonSchemas
		.map(jsonSchema => parseJsonSchema(jsonSchema))
		.reduce((acc, validator) => acc.and(validator))

const validateAnyOfJsonSchemas = (
	jsonSchemas: JsonSchema.Schema[]
): Type<unknown> =>
	jsonSchemas
		.map(jsonSchema => parseJsonSchema(jsonSchema))
		.reduce((acc, validator) => acc.or(validator))

const validateNotJsonSchema = (jsonSchema: JsonSchema.Schema) => {
	const inner = parseJsonSchema(jsonSchema)
	return type("unknown").narrow((data, ctx) =>
		inner.allows(data) ? ctx.mustBe(`not ${inner.description}`) : true
	) as Type<unknown>
}

const validateOneOfJsonSchemas = (jsonSchemas: JsonSchema.Schema[]) => {
	const oneOfValidators = jsonSchemas.map(nestedSchema =>
		parseJsonSchema(nestedSchema)
	)
	const oneOfValidatorsDescriptions = oneOfValidators.map(
		validator => `○ ${validator.description}`
	)
	return (
		(
			type("unknown").narrow((data, ctx) => {
				let matchedValidator: Type | undefined = undefined

				for (const validator of oneOfValidators) {
					if (validator.allows(data)) {
						if (matchedValidator === undefined) {
							matchedValidator = validator
							continue
						}
						return ctx.mustBe(
							`exactly one of:\n${oneOfValidatorsDescriptions.join("\n")}`
						)
					}
				}
				return matchedValidator !== undefined
			}) as Type<unknown>
		)
			// TODO: Theoretically this shouldn't be necessary due to above `ctx.mustBe` in narrow???
			.describe(`one of:\n${oneOfValidatorsDescriptions.join("\n")}\n`)
	)
}

export const parseJsonSchemaCompositionKeywords = (
	jsonSchema:
		| JsonSchema.TypeWithNoKeywords
		| JsonSchema.TypeWithKeywords
		| JsonSchema.AnyKeywords
		| JsonSchema.CompositionKeywords
): Type | undefined => {
	if ("allOf" in jsonSchema) return validateAllOfJsonSchemas(jsonSchema.allOf)
	if ("anyOf" in jsonSchema) return validateAnyOfJsonSchemas(jsonSchema.anyOf)
	if ("not" in jsonSchema) return validateNotJsonSchema(jsonSchema.not)
	if ("oneOf" in jsonSchema) return validateOneOfJsonSchemas(jsonSchema.oneOf)
}
