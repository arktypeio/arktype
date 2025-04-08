import type { array, JsonArray, JsonObject, listable } from "@ark/util"
import type { Unjsonifiable } from "./unjsonifiable.ts"

export type JsonSchema = JsonSchema.NonBooleanBranch
export type ListableJsonSchema = listable<JsonSchema>
export type JsonSchemaOrBoolean = listable<JsonSchema.Branch>

export declare namespace JsonSchema {
	export type TypeName =
		| "string"
		| "integer"
		| "number"
		| "object"
		| "array"
		| "boolean"
		| "null"

	/**
	 *  a subset of JSON Schema's annotations, see:
	 *  https://json-schema.org/understanding-json-schema/reference/annotations
	 **/
	export interface Meta<t = unknown> extends UniversalMeta<t> {
		$schema?: string
	}

	/**
	 * doesn't include root-only keys like $schema
	 */
	export interface UniversalMeta<t = unknown> {
		title?: string
		description?: string
		deprecated?: true
		default?: t
		examples?: readonly t[]
	}

	type Composition = Union | OneOf | Intersection | Not

	type NonBooleanBranch =
		| Constrainable
		| Const
		| Composition
		| Enum
		| String
		| Numeric
		| Object
		| Array

	export type Branch = boolean | JsonSchema

	export interface Constrainable extends Meta {
		type?: listable<TypeName>
	}

	export interface Intersection extends Meta {
		allOf: readonly JsonSchema[]
	}

	export interface Not extends Meta {
		not: JsonSchema
	}

	export interface OneOf extends Meta {
		oneOf: readonly JsonSchema[]
	}

	export interface Union extends Meta {
		anyOf: readonly JsonSchema[]
	}

	export interface Const extends Meta {
		const: unknown
	}

	export interface Enum extends Meta {
		enum: array
	}

	export interface String extends Meta<string> {
		type: "string"
		minLength?: number
		maxLength?: number
		pattern?: string
		format?: string
	}

	// NB: Technically 'exclusiveMaximum' and 'exclusiveMinimum' are mutually exclusive with 'maximum' and 'minimum', respectively,
	// which is reflected at runtime but it's not worth the performance cost to validate this statically.
	export interface Numeric extends Meta<number> {
		type: "number" | "integer"
		// NB: JSON Schema allows decimal multipleOf, but ArkType only supports integer.
		multipleOf?: number
		minimum?: number
		exclusiveMinimum?: number
		maximum?: number
		exclusiveMaximum?: number
	}

	// NB: Technically 'properties' is required when 'required' is present,
	// which is reflected at runtime but it's not worth the performance cost to validate this statically.
	export interface Object extends Meta<JsonObject> {
		type: "object"
		properties?: Record<string, JsonSchema>
		required?: string[]
		patternProperties?: Record<string, JsonSchema>
		additionalProperties?: JsonSchemaOrBoolean
		maxProperties?: number
		minProperties?: number
		propertyNames?: String
	}

	export interface Array extends Meta<JsonArray> {
		type: "array"
		additionalItems?: JsonSchemaOrBoolean
		contains?: JsonSchemaOrBoolean
		uniqueItems?: boolean
		minItems?: number
		maxItems?: number
		items?: JsonSchemaOrBoolean
		prefixItems?: readonly Branch[]
	}

	export type LengthBoundable = String | Array

	export type Structure = Object | Array

	export interface GenerateOptions {
		/** value to assign to the generated $schema key
		 *
		 *  - set to `null` to omit the `$schema` key
		 *  - does not affect the contents of the generated schema
		 *
		 * @default "https://json-schema.org/draft/2020-12/schema"
		 */
		dialect?: string | null
		fallback?: Unjsonifiable.HandlerByCode
	}

	export interface GenerateContext extends Required<GenerateOptions> {
		fallback: Required<Unjsonifiable.HandlerByCode>
	}
}
