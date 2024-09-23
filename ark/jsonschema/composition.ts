import type { array } from "@ark/util"
import { type, type Type } from "arktype"
import { innerParseJsonSchema, type inferJsonSchema } from "./json.js"
import type { JsonSchema } from "./scope.js"

const validateAllOfJsonSchemas = (
	jsonSchemas: JsonSchema.Schema[]
): Type<unknown> =>
	jsonSchemas
		.map(jsonSchema => innerParseJsonSchema.assert(jsonSchema))
		.reduce((acc, validator) => acc.and(validator))

const validateAnyOfJsonSchemas = (
	jsonSchemas: JsonSchema.Schema[]
): Type<unknown> =>
	jsonSchemas
		.map(jsonSchema => innerParseJsonSchema.assert(jsonSchema))
		.reduce((acc, validator) => acc.or(validator))

const validateNotJsonSchema = (jsonSchema: JsonSchema.Schema) => {
	const inner = innerParseJsonSchema.assert(jsonSchema)
	return type("unknown").narrow((data, ctx) =>
		inner.allows(data) ? ctx.mustBe(`not ${inner.description}`) : true
	) as Type<unknown>
}

const validateOneOfJsonSchemas = (jsonSchemas: JsonSchema.Schema[]) => {
	const oneOfValidators = jsonSchemas.map(nestedSchema =>
		innerParseJsonSchema.assert(nestedSchema)
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

// NB: For simplicity sake, the type level treats 'anyOf' and 'oneOf' as the same.
type inferJsonSchemaAnyOrOneOf<compositionSchemaValue, t> =
	compositionSchemaValue extends never[] ?
		never // is an empty array, so is invalid
	: compositionSchemaValue extends array ?
		t & inferJsonSchema<compositionSchemaValue>
	:	never // is not an array, so is invalid

export type inferJsonSchemaComposition<schema, t = unknown> =
	"allOf" extends keyof schema ?
		t extends never ?
			t // "allOf" has incompatible schemas, so don't keep looking
		: schema["allOf"] extends [infer firstSchema, ...infer restOfSchemas] ?
			inferJsonSchemaComposition<
				{ allOf: restOfSchemas },
				inferJsonSchema<firstSchema, t>
			>
		: schema["allOf"] extends never[] ?
			t // have finished inferring schemas
		:	never // "allOf" isn't an array, so is invalid
	: "oneOf" extends keyof schema ? inferJsonSchemaAnyOrOneOf<schema["oneOf"], t>
	: "anyOf" extends keyof schema ? inferJsonSchemaAnyOrOneOf<schema["anyOf"], t>
	: "not" extends keyof schema ?
		t // NB: TypeScript doesn't have "not" types, so can't accurately represent.
	:	unknown
