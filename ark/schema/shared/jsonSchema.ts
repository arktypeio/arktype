import {
	printable,
	throwInternalError,
	type array,
	type JsonArray,
	type JsonObject,
	type listable
} from "@ark/util"
import type { ConstraintKind } from "./implement.ts"

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
	export type Meta<t = unknown> = {
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

	export interface Not {
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
		pattern?: string | RegExp
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
}

export type UnsupportedJsonSchemaTypeMessageOptions = {
	description: string
	reason?: string
}

export const writeUnsupportedJsonSchemaTypeMessage = (
	input: string | UnsupportedJsonSchemaTypeMessageOptions
): string => {
	const normalized = typeof input === "string" ? { description: input } : input
	let message = `${normalized.description} is not convertible to JSON Schema`
	if (normalized.reason) message += ` because ${normalized.reason}`
	return message
}

export const writeJsonSchemaMorphMessage = (description: string): string =>
	writeUnsupportedJsonSchemaTypeMessage({
		description: `Morph ${description}`,
		reason:
			"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`."
	})

export const writeCyclicJsonSchemaMessage = (description: string): string =>
	writeUnsupportedJsonSchemaTypeMessage({
		description,
		reason:
			"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
	})

export const throwInternalJsonSchemaOperandError = (
	kind: ConstraintKind,
	schema: JsonSchema
): never =>
	throwInternalError(
		`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
	)
