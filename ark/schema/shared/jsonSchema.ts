import {
	isKeyOf,
	printable,
	throwInternalError,
	type autocomplete,
	type JsonArray,
	type JsonObject,
	type listable
} from "@ark/util"
import type { ConstraintKind } from "./implement.ts"

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
}

const unjsonifiableExplanations = {
	morph:
		"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`.",
	cyclic:
		"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
}

export const JsonSchema = {
	writeUnjsonifiableMessage: (
		description: string,
		additionalExplanation?: autocomplete<"morph" | "cyclic">
	): string => {
		let message = `${description} is not convertible to JSON Schema`

		if (additionalExplanation) {
			const normalizedExplanation =
				isKeyOf(additionalExplanation, unjsonifiableExplanations) ?
					unjsonifiableExplanations[additionalExplanation]
				:	additionalExplanation
			message += ` because ${normalizedExplanation}`
		}

		return message
	},
	throwInternalOperandError: (
		kind: ConstraintKind,
		schema: JsonSchema
	): never =>
		throwInternalError(
			`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
		)
}
