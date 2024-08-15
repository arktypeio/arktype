import type { listable } from "@ark/util"

export type JsonSchema = JsonSchema.Union | JsonSchema.Branch

export declare namespace JsonSchema {
	export type TypeName =
		| "string"
		| "integer"
		| "number"
		| "object"
		| "array"
		| "boolean"
		| "null"

	export interface Meta<t = unknown> {
		title?: string
		description?: string
		default?: t
		examples?: readonly t[]
	}

	export type Branch = Constrainable | Const | String | Numeric | Object | Array

	export interface Constrainable extends Meta {
		type?: listable<TypeName>
	}

	export interface Union extends Meta {
		anyOf: readonly Branch[]
	}

	export interface Const extends Meta {
		const: unknown
	}

	export interface String extends Meta<string> {
		type: "string"
		minLength?: number
		maxLength?: number
		pattern?: string
		format?: string
	}

	export interface Numeric extends Meta<number> {
		type: "number" | "integer"
		multipleOf?: number
		minimum?: number
		exclusiveMinimum?: number
		maximum?: number
		exclusiveMaximum?: number
	}

	export interface Object extends Meta<object> {
		type: "object"
		properties?: Record<string, JsonSchema>
		required?: string[]
		patternProperties?: Record<string, JsonSchema>
		additionalProperties?: boolean
	}

	export interface Array extends Meta<readonly unknown[]> {
		type: "array"
		minItems?: number
		maxItems?: number
		items?: readonly JsonSchema[]
		additionalItems?: boolean | JsonSchema
	}
}

export type UnsupportedJsonSchemaTypeMessageOptions = {
	prefix?: string
	description: string
	reason?: string
}

export const writeUnsupportedJsonSchemaTypeMessage = (
	input: string | UnsupportedJsonSchemaTypeMessageOptions
): string => {
	const normalized = typeof input === "string" ? { description: input } : input
	return `${normalized.description} is not convertible to JSON Schema`
}

export const writeJsonSchemaMorphMessage = (description: string): string =>
	writeUnsupportedJsonSchemaTypeMessage({
		prefix: "Morph",
		description,
		reason:
			"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`."
	})

export const writeCyclicJsonSchemaMessage = (description: string): string =>
	writeUnsupportedJsonSchemaTypeMessage({
		description,
		reason:
			"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
	})
