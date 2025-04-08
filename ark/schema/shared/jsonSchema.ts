import {
	isKeyOf,
	printable,
	throwError,
	throwInternalError,
	type array,
	type autocomplete,
	type Constructor,
	type JsonArray,
	type JsonObject,
	type listable,
	type requireKeys,
	type satisfy
} from "@ark/util"
import type { Predicate } from "../predicate.ts"
import type { Pattern } from "../refinements/pattern.ts"
import type { Domain } from "../roots/domain.ts"
import type { Morph } from "../roots/morph.ts"
import type { Proto } from "../roots/proto.ts"
import type { Unit } from "../roots/unit.ts"
import type { Index } from "../structure/index.ts"
import type { Prop } from "../structure/prop.ts"
import type { Sequence } from "../structure/sequence.ts"
import type { StructureNode } from "../structure/structure.ts"
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

	export type UnjsonifiableError = InstanceType<typeof JsonSchema.Unjsonifiable>

	export type UnjsonifiableContextByCode = {
		// good-ish
		pattern: (
			pattern: readonly [string, string, ...string[]],
			schema: JsonSchema.String
		) => JsonSchema.String
		unit: (unit: object | symbol | bigint | undefined) => JsonSchema
		domain: (
			domain: satisfy<Domain, "symbol" | "bigint" | "undefined">
		) => JsonSchema
		proto: (proto: Constructor) => JsonSchema

		// not done
		symbolKey: Prop.Node
		index: Index.Node
		arrayObject: (node: StructureNode) => {}
		arrayPostfix: (node: Sequence.Node, schema: Postfixable) => Postfixable

		morph: (node: Morph.Node) => JsonSchema
		predicate: (node: Predicate.Node, schema: Constrainable) => Constrainable
	}

	export type Postfixable = requireKeys<Array, "items">

	export type UnjsonifiableCode = keyof UnjsonifiableContextByCode

	export type ToContext = Required<ToOptions>

	export type Unjsonifiable = InstanceType<typeof JsonSchema.Unjsonifiable>

	export type ToResult<valid extends JsonSchema = JsonSchema> =
		| valid
		| Unjsonifiable
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
	Unjsonifiable: class Unjsonifiable<
		code extends JsonSchema.UnjsonifiableCode = JsonSchema.UnjsonifiableCode
	> {
		code: code
		ctx: JsonSchema.UnjsonifiableContextByCode[code]

		constructor(code: code, ctx: typeof this.ctx) {
			this.code = code
			this.ctx = ctx
		}

		throw(): never {
			throw new JsonSchema.UnjsonifiableError("")
		}
	},
	UnjsonifiableError: class UnjsonifiableError extends Error {},
	throwInternalOperandError: (
		kind: ConstraintKind,
		schema: JsonSchema
	): never =>
		throwInternalError(
			`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
		)
}
