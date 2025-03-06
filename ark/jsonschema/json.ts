import type { JsonSchemaOrBoolean } from "@ark/schema"
import { printable, throwParseError } from "@ark/util"
import { type, type JsonSchema } from "arktype"
import { parseArrayJsonSchema } from "./array.ts"
import { parseCommonJsonSchema } from "./common.ts"
import { parseCompositionJsonSchema } from "./composition.ts"
import { parseNumberJsonSchema } from "./number.ts"
import { parseObjectJsonSchema } from "./object.ts"
import { JsonSchemaScope } from "./scope.ts"
import { parseStringJsonSchema } from "./string.ts"

export const innerParseJsonSchema = JsonSchemaScope.Schema.pipe(
	(jsonSchema: JsonSchemaOrBoolean): type.Any => {
		if (typeof jsonSchema === "boolean") {
			if (jsonSchema) return JsonSchemaScope.Json
			else return type.never // No runtime value ever passes validation for JSON schema of 'false'
		}

		if (Array.isArray(jsonSchema)) {
			return (
				parseCompositionJsonSchema({ anyOf: jsonSchema }) ??
				throwParseError(
					"Failed to convert root array of JSON Schemas to an anyOf schema"
				)
			)
		}

		const constAndOrEnumValidator = parseCommonJsonSchema(
			jsonSchema as JsonSchema
		)
		const compositionValidator = parseCompositionJsonSchema(
			jsonSchema as JsonSchema
		)

		const preTypeValidator: type.Any | undefined =
			constAndOrEnumValidator ?
				compositionValidator ? compositionValidator.and(constAndOrEnumValidator)
				:	constAndOrEnumValidator
			:	compositionValidator

		if ("type" in jsonSchema) {
			const typeValidator: type.Any | undefined = type.match({
				"unknown[]": jsonType => parseCompositionJsonSchema({
					anyOf: jsonType.map(t => ({ type: t as never }))
				}),
				"'array'": () => parseArrayJsonSchema.assert(jsonSchema),
				"'boolean'|'null'": (t) => type(t),
				"'integer'|'number'": () => parseNumberJsonSchema.assert(jsonSchema),
				"'object'": () => parseObjectJsonSchema.assert(jsonSchema),
				"'string'": () => parseStringJsonSchema.assert(jsonSchema),
				"default": () => undefined
			})(jsonSchema.type);

			if (typeValidator === undefined) 
				throwParseError(`Provided 'type' value must be a supported JSON Schema type (was '${jsonSchema.type}')`)

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

export const parseJsonSchema = (jsonSchema: JsonSchemaOrBoolean): type.Any =>
	innerParseJsonSchema.assert(jsonSchema) as never
