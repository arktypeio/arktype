import {
	defineValue,
	hasKey,
	includes,
	isEmptyObject,
	printable,
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
		// draft-07's $defs, and where ~standard.jsonSchema writes OpenAPI's
		definitions?: Record<string, JsonSchema>
		examples?: t[]
		// OpenAPI 3.0's examples, which has one
		example?: t
		// OpenAPI 3.0 adds null to the type beside it
		nullable?: boolean
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
	 * the annotations a Type's meta writes to its JSON Schema, which doesn't
	 * include root-only keys like $schema
	 */
	export interface UniversalMeta<t = unknown> {
		title?: string
		description?: string
		format?: Format
		contentEncoding?: string
		deprecated?: boolean
		readOnly?: boolean
		writeOnly?: boolean
		$comment?: string
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
		discriminator?: Discriminator
	}

	/**
	 * OpenAPI's Discriminator Object, naming the property a oneOf's branches
	 * are told apart by
	 * https://spec.openapis.org/oas/v3.0.3#discriminator-object
	 */
	export interface Discriminator {
		propertyName: string
		/** the $ref of the branch each value selects */
		mapping?: Record<string, string>
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

	export interface Numeric extends Meta<number> {
		type: "number" | "integer"
		// NB: JSON Schema allows decimal multipleOf, but ArkType only supports integer.
		multipleOf?: number
		minimum?: number
		maximum?: number
		// OpenAPI 3.0 writes true beside minimum or maximum instead, which
		// number | boolean would say at the cost of fitting JSONSchema7
		exclusiveMinimum?: number
		exclusiveMaximum?: number
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
		propertyNames?: Branch
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

// ToJsonSchema.Error, here so a standalone validator's runtime, reading it from
// @ark/schema/runtime, throws the same class without the rest of toJsonSchema.ts
export class ToJsonSchemaError<
	code extends ToJsonSchema.Code = ToJsonSchema.Code
> extends Error {
	readonly name = "ToJsonSchemaError"
	readonly code: code
	readonly context: ToJsonSchema.ContextByCode[code]

	constructor(
		code: code,
		context: ToJsonSchema.ContextByCode[code],
		path = "",
		message = `Can't convert "${code}"${path && ` at ${path}`} to JSON Schema. Configure fallback.${code} to write it:\n${printable(context, { quoteKeys: false, indent: 4 })}`
	) {
		super(message)
		this.code = code
		this.context = context
	}

	hasCode<code extends ToJsonSchema.Code>(
		code: code
	): this is ToJsonSchemaError<code> {
		return this.code === (code as never)
	}
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
export const openApiNull = (): JsonSchema => ({
	type: "string",
	nullable: true,
	enum: [null]
})

/**
 * the key a union's object branches each require a string at, no value of
 * which two branches share, so exactly one branch can match any data
 */
export interface UnionDiscriminant {
	key: string
	/** the strings each branch allows at the key, in the order of the branches */
	values: string[][]
	/** whether OpenAPI's discriminator is written beside the oneOf */
	writesKeyword: boolean
}

// a union from the schemas of its branches, as arktype writes it and as a
// precompiled validator does where a branch is a call's fallback's
export const writeUnionJsonSchema = (
	branches: JsonSchema[],
	target: ToJsonSchema.Target,
	meta: object,
	metaJson: object,
	discriminant?: UnionDiscriminant
): JsonSchema => {
	// never: an empty enum is invalid OpenAPI 3.0, whose enum needs an item,
	// and LLM APIs like OpenAI's reject it, but every target has not
	if (!branches.length) return { not: {} }
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
		const { type } = branches[0]
		return type && branches.every(branch => branch.type === type) ?
				{ type, enum: values }
			:	{ enum: values }
	}
	return discriminant && branches.every(requiresKeyOf(discriminant.key)) ?
			writeOneOf(branches, discriminant)
		:	{ anyOf: branches }
}

// a fallback's result can replace a branch with one that doesn't
const requiresKeyOf =
	(key: string) =>
	(branch: JsonSchema): boolean =>
		"$ref" in branch || !!(branch as JsonSchema.Object).required?.includes(key)

// oneOf, since no data can match two of its branches, says to a generator
// what anyOf would only imply: that each is a distinct variant
const writeOneOf = (
	branches: JsonSchema[],
	{ key, values, writesKeyword }: UnionDiscriminant
): JsonSchema.OneOf => {
	if (!writesKeyword) return { oneOf: branches }
	// OpenAPI finds an inline branch by its own value at the property, but a
	// $ref only by its name, which a mapping replaces
	const mapping: Record<string, string> = {}
	for (let i = 0; i < branches.length; i++) {
		const ref = (branches[i] as JsonSchema.Ref).$ref
		// assigning "__proto__" would set the prototype
		if (ref) for (const value of values[i]) defineValue(mapping, value, ref)
	}
	return {
		oneOf: branches,
		discriminator:
			isEmptyObject(mapping) ?
				{ propertyName: key }
			:	{ propertyName: key, mapping }
	}
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
