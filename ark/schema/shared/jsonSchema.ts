import {
	isKeyOf,
	printable,
	throwError,
	throwInternalError,
	type autocomplete,
	type JsonArray,
	type JsonObject,
	type listable
} from "@ark/util"
import type { ConstraintKind } from "./implement.ts"

export type JsonSchema = JsonSchema.Union | JsonSchema.Branch

export type FinalJsonSchema = {
	$schema: "https://json-schema.org/draft/2020-12/schema"
} & JsonSchema

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

	export interface Object extends Meta<JsonObject> {
		type: "object"
		properties?: Record<string, JsonSchema>
		required?: string[]
		patternProperties?: Record<string, JsonSchema>
		additionalProperties?: false | JsonSchema
	}

	export interface Array extends Meta<JsonArray> {
		type: "array"
		minItems?: number
		maxItems?: number
		items?: JsonSchema | false
		prefixItems?: readonly JsonSchema[]
	}

	export type LengthBoundable = String | Array

	export type Structure = Object | Array

	export type UnjsonifiableError = InstanceType<
		typeof JsonSchema.UnjsonifiableError
	>
}

const unjsonifiableExplanations = {
	morph:
		"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`.",
	cyclic:
		"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
}

type UnjsonifiableExplanation = autocomplete<"morph" | "cyclic">

const writeUnjsonifiableMessage = (
	description: string,
	explanation?: UnjsonifiableExplanation
): string => {
	let message = `${description} is not convertible to JSON Schema`

	if (explanation) {
		const normalizedExplanation =
			isKeyOf(explanation, unjsonifiableExplanations) ?
				unjsonifiableExplanations[explanation]
			:	explanation
		message += ` because ${normalizedExplanation}`
	}

	return message
}

export const JsonSchema = {
	writeUnjsonifiableMessage,
	UnjsonifiableError: class UnjsonifiableError extends Error {},
	throwUnjsonifiableError: (
		...args: Parameters<typeof writeUnjsonifiableMessage>
	): never => throwError(writeUnjsonifiableMessage(...args)),
	throwInternalOperandError: (
		kind: ConstraintKind,
		schema: JsonSchema
	): never =>
		throwInternalError(
			`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
		)
}
