import {
	printable,
	throwParseError,
	type array,
	type ErrorMessage
} from "@ark/util"
import { type, type Out, type Type } from "arktype"
import { parseJsonSchemaAnyKeywords } from "./any.ts"
import { validateJsonSchemaArray, type inferJsonSchemaArray } from "./array.js"
import {
	parseJsonSchemaCompositionKeywords,
	type inferJsonSchemaComposition
} from "./composition.ts"
import {
	validateJsonSchemaNumber,
	type inferJsonSchemaNumber
} from "./number.js"
import {
	validateJsonSchemaObject,
	type inferJsonSchemaObject
} from "./object.js"
import { JsonSchema } from "./scope.js"
import {
	validateJsonSchemaString,
	type inferJsonSchemaString
} from "./string.js"

type JsonSchemaConstraintKind = "const" | "enum"
type JsonSchemaConst<t> = { const: t }
type JsonSchemaEnum<t> = { enum: readonly t[] }

type inferJsonSchemaConstraint<
	schema,
	t,
	kind extends JsonSchemaConstraintKind
> = t extends never ? never : t & inferJsonSchema<Omit<schema, kind>>

type inferJsonSchemaTypeNoKeywords<
	schema extends JsonSchema.TypeWithNoKeywords,
	t
> =
	schema["type"] extends "boolean" ? t & boolean
	: schema["type"] extends "null" ? t & null
	: never

export type inferJsonSchema<schema, t = unknown> =
	schema extends true ? JsonSchema.Json
	: schema extends false ? never
	: schema extends Record<PropertyKey, never> ? JsonSchema.Json
	: schema extends array ? inferJsonSchema<schema[number], t>
	: schema extends JsonSchema.CompositionKeywords ?
		inferJsonSchemaComposition<schema, t>
	: schema extends JsonSchemaConst<infer c> ?
		inferJsonSchemaConstraint<schema, t & c, "const">
	: schema extends JsonSchemaEnum<infer e> ?
		inferJsonSchemaConstraint<schema, t & e, "enum">
	: schema extends JsonSchema.TypeWithNoKeywords ?
		inferJsonSchemaTypeNoKeywords<schema, t>
	: schema extends JsonSchema.ArraySchema ? inferJsonSchemaArray<schema>
	: schema extends JsonSchema.NumberSchema ? t & inferJsonSchemaNumber<schema>
	: schema extends JsonSchema.ObjectSchema ? t & inferJsonSchemaObject<schema>
	: schema extends JsonSchema.StringSchema ? t & inferJsonSchemaString<schema>
	: t extends {} ? t
	: ErrorMessage<"Failed to infer JSON Schema">

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
		return preTypeValidator // TODO: Is this actually the correct thing to return???
	}
)

export const parseJsonSchema = <const t extends JsonSchema.Schema>(
	jsonSchema: t
): Type<inferJsonSchema<t>> => innerParseJsonSchema.assert(jsonSchema) as never
