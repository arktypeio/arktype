import {
	isKeyOf,
	printable,
	throwInternalError,
	type array,
	type autocomplete,
	type Constructor,
	type JsonArray,
	type JsonObject,
	type listable,
	type minLengthArray,
	type requireKeys,
	type satisfy
} from "@ark/util"
import type { Predicate } from "../predicate.ts"
import type { Domain } from "../roots/domain.ts"
import type { ConstraintKind } from "./implement.ts"

export type JsonSchema = JsonSchema.NonBooleanBranch
export type ListableJsonSchema = listable<JsonSchema>
export type JsonSchemaOrBoolean = listable<JsonSchema.Branch>

export declare namespace JsonSchema {
	export interface ToOptions {
		/** value to assign to the generated $schema key
		 *
		 *  - set to `null` to omit the `$schema` key
		 *  - does not affect the contents of the generated schema
		 *
		 * @default "https://json-schema.org/draft/2020-12/schema"
		 */
		dialect?: string | null
	}

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

	export type ToContext = Required<ToOptions>

	export type ToResult<valid extends JsonSchema = JsonSchema> =
		| valid
		| Unjsonifiable
}

export class Unjsonifiable<
	code extends Unjsonifiable.Code = Unjsonifiable.Code
> {
	code: code
	ctx: Unjsonifiable.ContextByCode[code]

	constructor(code: code, ctx: typeof this.ctx) {
		this.code = code
		this.ctx = ctx
	}

	throw(): never {
		throw new Unjsonifiable.Error("")
	}

	static Error = class extends Error {}
	static throwInternalOperandError = (
		kind: ConstraintKind,
		schema: JsonSchema
	): never =>
		throwInternalError(
			`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
		)

	static writeMessage = (
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
}

export declare namespace Unjsonifiable {
	export type Error = InstanceType<typeof Unjsonifiable>

	export type Value = object | symbol | bigint | undefined

	export type PatternIntersectionContext = {
		pattern: minLengthArray<string, 2>
		schema: JsonSchema.String
	}

	export type UnitContext = {
		unit: Unjsonifiable.Value
	}

	export type DomainContext = {
		domain: satisfy<Domain, "symbol" | "bigint" | "undefined">
	}
	export type ProtoContext = {
		proto: Constructor
	}

	export type SymbolKeyContext = {
		key: symbol
	}

	export type IndexContext = {
		signature: JsonSchema.String
		value: JsonSchema
	}

	export type ArrayObjectContext = {
		array: JsonSchema.Array
		object: JsonSchema.Object
	}

	export type ArrayPostfixContext = {
		base: Postfixable
		elements: minLengthArray<JsonSchema, 1>
	}

	export type MorphContext = {
		in: JsonSchema
		out: JsonSchema
	}

	export type PredicateContext = {
		base: JsonSchema.Constrainable
		predicate: Predicate
	}

	export interface ContextByCode {
		patternIntersection: PatternIntersectionContext
		unit: UnitContext
		domain: DomainContext
		proto: ProtoContext
		symbolKey: SymbolKeyContext
		index: IndexContext
		arrayObject: ArrayObjectContext
		arrayPostfix: ArrayPostfixContext
		morph: MorphContext
		predicate: PredicateContext
	}

	export type HandlerByCode = satisfy<
		{ [code in Code]: (ctx: ContextByCode[code]) => unknown },
		{
			patternIntersection: (
				ctx: PatternIntersectionContext
			) => JsonSchema.String
			unit: (ctx: UnitContext) => JsonSchema
			domain: (ctx: DomainContext) => JsonSchema
			proto: (ctx: ProtoContext) => JsonSchema
			symbolKey: (ctx: SymbolKeyContext) => string | null
			index: (ctx: IndexContext) => JsonSchema
			arrayObject: (ctx: ArrayObjectContext) => JsonSchema
			arrayPostfix: (ctx: ArrayPostfixContext) => Postfixable
			morph: (ctx: MorphContext) => JsonSchema
			predicate: (ctx: PredicateContext) => JsonSchema.Constrainable
		}
	>
	export type Postfixable = requireKeys<JsonSchema.Array, "items">

	export type Code = keyof ContextByCode
}

const unjsonifiableExplanations = {
	morph:
		"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`.",
	cyclic:
		"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
}

type UnjsonifiableExplanation = autocomplete<"morph" | "cyclic">
