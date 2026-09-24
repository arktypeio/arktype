import type { Traversal } from "@ark/schema"
import { printable, type array } from "@ark/util"
import { type, type JsonSchema, type Type } from "arktype"
import { jsonSchemaToType, type inferJsonSchema } from "./json.ts"

// NB: For simplicity sake, the type level treats 'anyOf' and 'oneOf' as the same.
type inferJsonSchemaAnyOrOneOf<compositionSchemaValue, t> =
	compositionSchemaValue extends never[] ?
		never // is an empty array, so is invalid
	: compositionSchemaValue extends array ?
		t & inferJsonSchema<compositionSchemaValue>
	:	never // is not an array, so is invalid

export type inferJsonSchemaComposition<schema, t> =
	"allOf" extends keyof schema ?
		t extends never ?
			t // "allOf" has incompatible schemas, so don't keep looking
		: schema["allOf"] extends (
			readonly [infer firstSchema, ...infer restOfSchemas]
		) ?
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
	:	never

const parseAllOfJsonSchema = (jsonSchemas: readonly JsonSchema[]): Type =>
	jsonSchemas
		// @ts-ignore Suppress 'excessivevely deep and possibly infinite' error
		.map(jsonSchema => jsonSchemaToType(jsonSchema as never))
		.reduce((acc, validator) => acc.and(validator))

export const parseAnyOfJsonSchema = (
	jsonSchemas: readonly JsonSchema[]
): Type =>
	jsonSchemas
		.map(jsonSchema => jsonSchemaToType(jsonSchema as never))
		.reduce((acc, validator) => acc.or(validator))

const parseNotJsonSchema = (jsonSchema: JsonSchema): Type => {
	const inner = jsonSchemaToType(jsonSchema as never)

	const jsonSchemaNotValidator = (data: unknown, ctx: Traversal) =>
		inner.allows(data) ?
			ctx.reject({
				expected: `not: ${inner.description}`,
				actual: printable(data)
			})
		:	true
	return type.unknown.narrow(jsonSchemaNotValidator)
}

const parseOneOfJsonSchema = (jsonSchemas: readonly JsonSchema[]): Type => {
	const oneOfValidators = jsonSchemas.map(nestedSchema =>
		jsonSchemaToType(nestedSchema as never)
	)
	const oneOfValidatorsDescriptions = oneOfValidators.map(
		validator => `○ ${validator.description}`
	)
	const jsonSchemaOneOfValidator = (data: unknown, ctx: Traversal) => {
		let matchedValidator: Type | undefined = undefined

		for (const validator of oneOfValidators) {
			if (validator.allows(data)) {
				if (matchedValidator === undefined) {
					matchedValidator = validator
					continue
				}
				return ctx.reject({
					expected: `exactly one of:\n${oneOfValidatorsDescriptions.join("\n")}`,
					actual: `a value that matches against at least ${matchedValidator} and ${validator}`
				})
			}
		}
		return matchedValidator !== undefined
	}
	return type.unknown.narrow(jsonSchemaOneOfValidator)
}

export const parseCompositionJsonSchema = (
	jsonSchema: JsonSchema
): Type | undefined => {
	if ("allOf" in jsonSchema) return parseAllOfJsonSchema(jsonSchema.allOf)
	if ("anyOf" in jsonSchema) return parseAnyOfJsonSchema(jsonSchema.anyOf)
	if ("not" in jsonSchema) return parseNotJsonSchema(jsonSchema.not)
	if ("oneOf" in jsonSchema) return parseOneOfJsonSchema(jsonSchema.oneOf)
}
