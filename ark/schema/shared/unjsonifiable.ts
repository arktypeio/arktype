import {
	isKeyOf,
	printable,
	throwInternalError,
	type autocomplete,
	type Constructor,
	type Domain,
	type Json,
	type requireKeys,
	type satisfy
} from "@ark/util"
import type { Predicate } from "../predicate.ts"
import type { ConstraintKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"

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

	export interface BaseContext<base extends JsonSchema = JsonSchema> {
		base: base
	}

	export interface PatternIntersectionContext
		extends BaseContext<StringSchemaWithPattern> {
		pattern: string
	}

	export interface UnitContext extends BaseContext {
		unit: Unjsonifiable.Value
	}

	export interface DomainContext extends BaseContext {
		domain: satisfy<Domain, "symbol" | "bigint" | "undefined">
	}

	export interface ProtoContext extends BaseContext {
		proto: Constructor
	}

	export type SymbolKeyContext =
		| IndexSymbolKeyContext
		| RequiredSymbolKeyContext
		| OptionalSymbolKeyContext

	interface IndexSymbolKeyContext extends BaseContext<JsonSchema.Object> {
		key: null
		value: JsonSchema
		optional: false
	}

	interface RequiredSymbolKeyContext extends BaseContext<JsonSchema.Object> {
		key: symbol
		value: JsonSchema
		optional: false
	}

	interface OptionalSymbolKeyContext extends BaseContext<JsonSchema.Object> {
		key: symbol
		value: JsonSchema
		optional: true
		default?: Json
	}

	export interface IndexContext extends BaseContext {
		signature: JsonSchema.String
		value: JsonSchema
	}

	export interface ArrayObjectContext extends BaseContext<JsonSchema.Array> {
		object: JsonSchema.Object
	}

	export interface ArrayPostfixContext extends BaseContext<PostfixableSchema> {
		elements: readonly JsonSchema[]
	}

	export interface MorphContext extends BaseContext {
		in: JsonSchema
		out: JsonSchema
	}

	export interface PredicateContext
		extends BaseContext<JsonSchema.Constrainable> {
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
			unit: (ctx: UnitContext) => JsonSchema
			domain: (ctx: DomainContext) => JsonSchema
			proto: (ctx: ProtoContext) => JsonSchema
			patternIntersection: (
				ctx: PatternIntersectionContext
			) => JsonSchema.String
			symbolKey: (ctx: SymbolKeyContext) => JsonSchema.Object
			index: (ctx: IndexContext) => JsonSchema
			arrayObject: (ctx: ArrayObjectContext) => JsonSchema.Structure
			arrayPostfix: (ctx: ArrayPostfixContext) => PostfixableSchema
			morph: (ctx: MorphContext) => JsonSchema
			predicate: (ctx: PredicateContext) => JsonSchema.Constrainable
		}
	>
	export type PostfixableSchema = requireKeys<JsonSchema.Array, "items">

	export type StringSchemaWithPattern = requireKeys<
		JsonSchema.String,
		"pattern"
	>

	export type Code = keyof ContextByCode
}

const unjsonifiableExplanations = {
	morph:
		"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`.",
	cyclic:
		"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
}

type UnjsonifiableExplanation = autocomplete<"morph" | "cyclic">
