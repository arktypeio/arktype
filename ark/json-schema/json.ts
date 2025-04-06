import { describeBranches, type JsonSchemaOrBoolean } from "@ark/schema"
import { printable, throwParseError } from "@ark/util"
import { type, type JsonSchema } from "arktype"
import { parseArrayJsonSchema } from "./array.ts"
import { parseCommonJsonSchema } from "./common.ts"
import {
	parseAnyOfJsonSchema,
	parseCompositionJsonSchema
} from "./composition.ts"
import {
	writeJsonSchemaInsufficientKeysMessage,
	writeJsonSchemaUnsupportedTypeMessage
} from "./errors.ts"
import { parseNumberJsonSchema } from "./number.ts"
import { parseObjectJsonSchema } from "./object.ts"
import { JsonSchemaScope } from "./scope.ts"
import { parseStringJsonSchema } from "./string.ts"

const jsonSchemaTypeMatcher = type.match
	.in<JsonSchema>()
	.at("type")
	.match({
		"unknown[]": jsonSchema =>
			parseCompositionJsonSchema({
				anyOf: jsonSchema.type.map(t => ({ type: t as never }))
			}),
		"'array'": jsonSchema => parseArrayJsonSchema.assert(jsonSchema),
		"'boolean'|'null'": jsonSchema => type(jsonSchema.type),
		"'integer'|'number'": jsonSchema =>
			parseNumberJsonSchema.assert(jsonSchema),
		"'object'": jsonSchema => parseObjectJsonSchema.assert(jsonSchema),
		"'string'": jsonSchema => parseStringJsonSchema.assert(jsonSchema),
		default: () => undefined
	})

export const innerParseJsonSchema = JsonSchemaScope.Schema.pipe(
	(jsonSchema: JsonSchemaOrBoolean): type.Any => {
		if (typeof jsonSchema === "boolean") {
			if (jsonSchema) return JsonSchemaScope.Json
			else return type.never // No runtime value ever passes validation for JSON schema of 'false'
		}

		if (Array.isArray(jsonSchema)) return parseAnyOfJsonSchema(jsonSchema)

		const constAndOrEnumValidator = parseCommonJsonSchema(
			jsonSchema as JsonSchema
		)
		const compositionValidator = parseCompositionJsonSchema(
			jsonSchema as JsonSchema
		)

		const preTypeValidator =
			constAndOrEnumValidator ?
				compositionValidator ? compositionValidator.and(constAndOrEnumValidator)
				:	constAndOrEnumValidator
			:	compositionValidator

		if ("type" in jsonSchema) {
			const typeValidator = jsonSchemaTypeMatcher(jsonSchema)

			if (typeValidator === undefined) {
				throwParseError(
					writeJsonSchemaUnsupportedTypeMessage(printable(jsonSchema.type))
				)
			}

			if (preTypeValidator === undefined) return typeValidator
			return typeValidator.and(preTypeValidator)
		}
		if (preTypeValidator === undefined) {
			const atLeastOneOf = [
				"'type'",
				"'enum'",
				"'const'",
				"'allOf'",
				"'anyOf'",
				"'oneOf'",
				"'not'"
			]
			throwParseError(
				writeJsonSchemaInsufficientKeysMessage(
					describeBranches(atLeastOneOf, { finalDelimiter: " and " }),
					printable(jsonSchema)
				)
			)
		}
		return preTypeValidator
	}
)

export const jsonSchemaToType = (jsonSchema: JsonSchemaOrBoolean): type.Any =>
	innerParseJsonSchema.assert(jsonSchema) as never
