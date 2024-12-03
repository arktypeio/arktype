import { scope, type Scope } from "arktype"

type AnyKeywords = {
	const?: unknown
	enum?: unknown[]
}
export type CompositionKeywords = {
	allOf?: Schema[]
	anyOf?: Schema[]
	oneOf?: Schema[]
	not?: Schema
}
type TypeWithNoKeywords = { type: "boolean" | "null" }
type TypeWithKeywords = ArraySchema | NumberSchema | ObjectSchema | StringSchema
// NB: For sake of simplicitly, at runtime it's assumed that
// whatever we're parsing is valid JSON since it will be 99% of the time.
// This decision may be changed later, e.g. when a built-in JSON type exists in AT.
type Json = unknown
type BaseSchema =
	// NB: `true` means "accept an valid JSON"; `false` means "reject everything".
	| boolean
	| TypeWithNoKeywords
	| TypeWithKeywords
	| AnyKeywords
	| CompositionKeywords
type Schema = BaseSchema | BaseSchema[]
export type ArraySchema = {
	additionalItems?: Schema
	contains?: Schema
	// JSON Schema states that if 'items' is not present, then treat as an empty schema (i.e. accept any valid JSON)
	items?: Schema | Schema[]
	maxItems?: number
	minItems?: number
	// NB: Technically `prefixItems` and `items` are mutually exclusive,
	// which is reflected at runtime but it's not worth the performance cost to validate this statically.
	prefixItems?: Schema[]
	type: "array"
	uniqueItems?: boolean
}
type NumberSchema = {
	// NB: Technically 'exclusiveMaximum' and 'exclusiveMinimum' are mutually exclusive with 'maximum' and 'minimum', respectively,
	// which is reflected at runtime but it's not worth the performance cost to validate this statically.
	exclusiveMaximum?: number
	exclusiveMinimum?: number
	maximum?: number
	minimum?: number
	// NB: JSON Schema allows decimal multipleOf, but ArkType only supports integer.
	multipleOf?: number
	type: "number" | "integer"
}
export type ObjectSchema = {
	additionalProperties?: Schema
	maxProperties?: number
	minProperties?: number
	patternProperties?: { [k: string]: Schema }
	// NB: Technically 'properties' is required when 'required' is present,
	// which is reflected at runtime but it's not worth the performance cost to validate this statically.
	properties?: { [k: string]: Schema }
	propertyNames?: Schema
	required?: string[]
	type: "object"
}
type StringSchema = {
	maxLength?: number
	minLength?: number
	pattern?: RegExp | string
	type: "string"
}

type JsonSchemaScope = Scope<{
	AnyKeywords: AnyKeywords
	CompositionKeywords: CompositionKeywords
	TypeWithNoKeywords: TypeWithNoKeywords
	TypeWithKeywords: TypeWithKeywords
	Json: Json
	Schema: Schema
	ArraySchema: ArraySchema
	NumberSchema: NumberSchema
	ObjectSchema: ObjectSchema
	StringSchema: StringSchema
}>

const $: JsonSchemaScope = scope({
	AnyKeywords: {
		"const?": "unknown",
		"enum?": "unknown[]"
	},
	CompositionKeywords: {
		"allOf?": "Schema[]",
		"anyOf?": "Schema[]",
		"oneOf?": "Schema[]",
		"not?": "Schema"
	},
	TypeWithNoKeywords: { type: "'boolean'|'null'" },
	TypeWithKeywords: "ArraySchema|NumberSchema|ObjectSchema|StringSchema",
	// NB: For sake of simplicitly, at runtime it's assumed that
	// whatever we're parsing is valid JSON since it will be 99% of the time.
	// This decision may be changed later, e.g. when a built-in JSON type exists in AT.
	Json: "unknown",
	"#BaseSchema":
		// NB: `true` means "accept an valid JSON"; `false` means "reject everything".
		"boolean|TypeWithNoKeywords|TypeWithKeywords|AnyKeywords|CompositionKeywords",
	Schema: "BaseSchema|BaseSchema[]",
	ArraySchema: {
		"additionalItems?": "Schema",
		"contains?": "Schema",
		// JSON Schema states that if 'items' is not present, then treat as an empty schema (i.e. accept any valid JSON)
		"items?": "Schema|Schema[]",
		"maxItems?": "number.integer>=0",
		"minItems?": "number.integer>=0",
		// NB: Technically `prefixItems` and `items` are mutually exclusive,
		// which is reflected at runtime but it's not worth the performance cost to validate this statically.
		"prefixItems?": "Schema[]",
		type: "'array'",
		"uniqueItems?": "boolean"
	},
	NumberSchema: {
		// NB: Technically 'exclusiveMaximum' and 'exclusiveMinimum' are mutually exclusive with 'maximum' and 'minimum', respectively,
		// which is reflected at runtime but it's not worth the performance cost to validate this statically.
		"exclusiveMaximum?": "number",
		"exclusiveMinimum?": "number",
		"maximum?": "number",
		"minimum?": "number",
		// NB: JSON Schema allows decimal multipleOf, but ArkType only supports integer.
		"multipleOf?": "number.integer",
		type: "'number'|'integer'"
	},
	ObjectSchema: {
		"additionalProperties?": "Schema",
		"maxProperties?": "number.integer>=0",
		"minProperties?": "number.integer>=0",
		"patternProperties?": { "[string]": "Schema" },
		// NB: Technically 'properties' is required when 'required' is present,
		// which is reflected at runtime but it's not worth the performance cost to validate this statically.
		"properties?": { "[string]": "Schema" },
		"propertyNames?": "Schema",
		"required?": "string[]",
		type: "'object'"
	},
	StringSchema: {
		"maxLength?": "number.integer>=0",
		"minLength?": "number.integer>=0",
		"pattern?": "RegExp | string",
		type: "'string'"
	}
}) as unknown as JsonSchemaScope
export const JsonSchema = $.export()

export declare namespace JsonSchema {
	export type $ = typeof $
	export type Schema = typeof JsonSchema.Schema.infer
	export type Json = typeof JsonSchema.Json.infer
	export type AnyKeywords = typeof JsonSchema.AnyKeywords.infer
	export type CompositionKeywords = typeof JsonSchema.CompositionKeywords.infer
	export type TypeWithKeywords = typeof JsonSchema.TypeWithKeywords.infer
	export type TypeWithNoKeywords = typeof JsonSchema.TypeWithNoKeywords.infer
	export type ArraySchema = typeof JsonSchema.ArraySchema.infer
	export type NumberSchema = typeof JsonSchema.NumberSchema.infer
	export type ObjectSchema = typeof JsonSchema.ObjectSchema.infer
	export type StringSchema = typeof JsonSchema.StringSchema.infer
}
