import {
	hasKey,
	includes,
	throwParseError,
	type autocomplete,
	type Json,
	type JsonArray,
	type JsonObject,
	type listable
} from "@ark/util"
import type { StandardJSONSchemaV1 } from "./standardSchema.ts"
import type { ToJsonSchema } from "./toJsonSchema.ts"

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
	export interface Meta<t = Json> extends UniversalMeta<t> {
		// any other keyword, e.g. an extension like x-internal
		[k: string]: unknown
		$schema?: string
		$defs?: Record<string, JsonSchema>
		examples?: t[]
	}

	export type Format = autocomplete<
		| "date-time"
		| "date"
		| "time"
		| "email"
		| "ipv4"
		| "ipv6"
		| "uri"
		| "uuid"
		| "regex"
	>

	/**
	 * doesn't include root-only keys like $schema
	 */
	export interface UniversalMeta<t = unknown> {
		title?: string
		description?: string
		format?: Format
		contentEncoding?: string
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
		| Ref

	export type Branch = boolean | JsonSchema

	// any JSON Schema document, typed loosely to fit other libraries'
	export type Input = Branch | object

	export type RefString =
		`#/${"$defs" | "definitions" | "components/schemas"}/${string}`

	// extending Meta and including "type" as an optional prop are important for
	// interacting with JsonSchema as a union, although generally $ref should be
	// the only key.
	export interface Ref extends Meta {
		$ref: RefString
		type?: never
	}

	export interface Constrainable extends Meta {
		type?: TypeName | TypeName[]
	}

	export interface Intersection extends Meta {
		allOf: JsonSchema[]
	}

	export interface Not extends Meta {
		not: JsonSchema
	}

	export interface OneOf extends Meta {
		oneOf: JsonSchema[]
	}

	export interface Union extends Meta {
		anyOf: JsonSchema[]
	}

	export interface Const extends Meta {
		const: Json
	}

	export interface Enum extends Meta {
		enum: Json[]
	}

	export interface String extends Meta<string> {
		type: "string"
		minLength?: number
		maxLength?: number
		pattern?: string
		format?: string
		not?: JsonSchema
		contentMediaType?: string
	}

	// exclusiveMinimum and exclusiveMaximum are left to the index signature:
	// openapi-3.0 writes them as booleans
	export interface Numeric extends Meta<number> {
		type: "number" | "integer"
		// NB: JSON Schema allows decimal multipleOf, but ArkType only supports integer.
		multipleOf?: number
		minimum?: number
		maximum?: number
		not?: Const | Enum
	}

	// NB: Technically 'properties' is required when 'required' is present,
	// which is reflected at runtime but it's not worth the performance cost to validate this statically.
	export interface Object extends Meta<JsonObject> {
		type: "object"
		properties?: Record<string, JsonSchema>
		required?: string[]
		patternProperties?: Record<string, JsonSchema>
		additionalProperties?: Branch
		maxProperties?: number
		minProperties?: number
		propertyNames?: String
	}

	export interface Array extends Meta<JsonArray> {
		type: "array"
		additionalItems?: Branch
		contains?: Branch
		uniqueItems?: boolean
		minItems?: number
		maxItems?: number
		// draft-07 writes a tuple's elements as an array
		items?: Branch | Branch[]
		prefixItems?: Branch[]
		not?: JsonSchema
	}

	export type LengthBoundable = String | Array

	export type Structure = Object | Array
}

export const supportedJsonSchemaTargets: readonly ToJsonSchema.Target[] = [
	"draft-2020-12",
	"draft-07",
	"openapi-3.0"
]

export const writeInvalidJsonSchemaTargetMessage = (target: string): string => {
	const quoted = supportedJsonSchemaTargets.map(t => `"${t}"`)
	return `JSONSchema target '${target}' is not supported (must be ${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1]})`
}

export const validateStandardJsonSchemaTarget = (
	target: StandardJSONSchemaV1.Target
): ToJsonSchema.Target => {
	if (!includes(supportedJsonSchemaTargets, target))
		throwParseError(writeInvalidJsonSchemaTargetMessage(target))

	return target
}

type UnitJsonSchema = JsonSchema.Const &
	JsonSchema.Enum &
	JsonSchema.Constrainable

// an OpenAPI Schema Object has no null type, and nullable only adds null to a
// type beside it
export const openApiNull = (): JsonSchema =>
	({ type: "string", nullable: true, enum: [null] }) as JsonSchema

// a union from the schemas of its branches, as arktype writes it and as a
// precompiled validator does where a branch is a call's fallback's
export const writeUnionJsonSchema = (
	branches: JsonSchema[],
	target: ToJsonSchema.Target,
	meta: object,
	metaJson: object
): JsonSchema => {
	// what's left of a union without its null
	if (branches.length === 1) return branches[0]
	const unitKey = target === "openapi-3.0" ? "enum" : "const"
	if (
		branches.every(
			(branch): branch is UnitJsonSchema =>
				// units with no meta but the union's own are an enum
				Object.entries(branch).every(
					([k, v]) =>
						k === unitKey ||
						k === "type" ||
						v === (meta as Record<string, unknown>)[k] ||
						v === (metaJson as Record<string, unknown>)[k]
				) && hasKey(branch, unitKey)
		)
	) {
		const values = branches.flatMap(branch =>
			unitKey === "enum" ? branch.enum : [branch.const]
		)
		// never has no branches
		const type = branches[0]?.type
		return type && branches.every(branch => branch.type === type) ?
				{ type, enum: values }
			:	{ enum: values }
	}
	return { anyOf: branches }
}

// a union with null, written beside the rest so their values still share a type
export const writeNullableJsonSchema = (
	schema: JsonSchema,
	// whether the rest is a union of its own
	isUnion: boolean,
	target: ToJsonSchema.Target
): JsonSchema => {
	// nullable adds null to the type beside it, so an enum must list it
	if (
		target === "openapi-3.0" &&
		typeof (schema as JsonSchema.Constrainable).type === "string"
	) {
		return Object.assign(
			schema,
			{ nullable: true },
			"enum" in schema && {
				enum: [...(schema as JsonSchema.Enum).enum, null]
			}
		)
	}
	return {
		anyOf: [
			...(isUnion && "anyOf" in schema ?
				(schema as JsonSchema.Union).anyOf
			:	[schema]),
			target === "openapi-3.0" ? openApiNull() : { type: "null" }
		]
	}
}
