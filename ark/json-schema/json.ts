import { describeBranches, type JsonSchemaOrBoolean } from "@ark/schema"
import {
	printable,
	throwParseError,
	type array,
	type ErrorMessage,
	type Json
} from "@ark/util"
import { type, type JsonSchema } from "arktype"
import { parseArrayJsonSchema, type inferJsonSchemaArray } from "./array.ts"
import { parseCommonJsonSchema } from "./common.ts"
import {
	parseAnyOfJsonSchema,
	parseCompositionJsonSchema,
	type inferJsonSchemaComposition
} from "./composition.ts"
import {
	writeJsonSchemaInsufficientKeysMessage,
	writeJsonSchemaUnsupportedTypeMessage
} from "./errors.ts"
import { parseNumberJsonSchema } from "./number.ts"
import { parseObjectJsonSchema, type inferJsonSchemaObject } from "./object.ts"
import { JsonSchemaScope } from "./scope.ts"
import { parseStringJsonSchema, type inferJsonSchemaString } from "./string.ts"

type JsonSchemaConstraintKind = "const" | "enum"
type JsonSchemaConst<t> = { const: t }
type JsonSchemaEnum<t> = { enum: readonly t[] }

type inferJsonSchemaConstraint<
	schema,
	t,
	kind extends JsonSchemaConstraintKind
> = t extends never ? never : t & inferJsonSchema<Omit<schema, kind>>

export type inferJsonSchema<schema, t = unknown> =
	schema extends true | Record<PropertyKey, never> ? Json
	: schema extends false ? never
	: schema extends array ? inferJsonSchema<schema[number], t>
	: schema extends JsonSchema.Composition ?
		inferJsonSchemaComposition<schema, t>
	: schema extends JsonSchemaConst<infer c> ?
		inferJsonSchemaConstraint<schema, t & c, "const">
	: schema extends JsonSchemaEnum<infer e> ?
		inferJsonSchemaConstraint<schema, t & e, "enum">
	: schema extends { type: "boolean" } ? t & boolean
	: schema extends { type: "null" } ? t & null
	: schema extends JsonSchema.Numeric ? t & number
	: schema extends JsonSchema.Array ? t & inferJsonSchemaArray<schema>
	: schema extends JsonSchema.Object ? t & inferJsonSchemaObject<schema>
	: schema extends JsonSchema.String ? t & inferJsonSchemaString
	: t extends {} ? t
	: ErrorMessage<"Failed to infer JSON Schema">

const jsonSchemaTypeMatcher = type.match
	.in<Extract<JsonSchema, { type?: unknown }>>()
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
		if (typeof jsonSchema === "boolean")
			// no runtime value ever passes validation for JSON schema of 'false'
			return jsonSchema ? JsonSchemaScope.Json : type.never

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
			const typeValidator = jsonSchemaTypeMatcher(jsonSchema as never) as
				| type.Any
				| undefined

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

export const jsonSchemaToType = <const t extends JsonSchemaOrBoolean>(
	jsonSchema: t
): type<inferJsonSchema<t>> => innerParseJsonSchema.assert(jsonSchema) as never
