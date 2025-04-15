import {
	printable,
	throwInternalError,
	type Constructor,
	type Domain,
	type Json,
	type requireKeys,
	type satisfy
} from "@ark/util"
import type { Predicate } from "../predicate.ts"
import type { ConstraintKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"

class ToJsonSchemaError<
	code extends ToJsonSchema.Code = ToJsonSchema.Code
> extends Error {
	readonly name = "ToJsonSchemaError"
	readonly code: code
	readonly context: ToJsonSchema.ContextByCode[code]

	constructor(code: code, context: ToJsonSchema.ContextByCode[code]) {
		super(printable(context, { quoteKeys: false, indent: 4 }))
		this.code = code
		this.context = context
	}

	hasCode<code extends ToJsonSchema.Code>(
		code: code
	): this is ToJsonSchemaError<code> {
		return this.code === (code as never)
	}
}

const defaultConfig: ToJsonSchema.Context = {
	dialect: "https://json-schema.org/draft/2020-12/schema",
	fallback: {
		arrayObject: ctx => ToJsonSchema.throw("arrayObject", ctx),
		arrayPostfix: ctx => ToJsonSchema.throw("arrayPostfix", ctx),
		default: ctx => ToJsonSchema.throw("default", ctx),
		domain: ctx => ToJsonSchema.throw("domain", ctx),
		morph: ctx => ToJsonSchema.throw("morph", ctx),
		patternIntersection: ctx => ToJsonSchema.throw("patternIntersection", ctx),
		predicate: ctx => ToJsonSchema.throw("predicate", ctx),
		proto: ctx => ToJsonSchema.throw("proto", ctx),
		symbolKey: ctx => ToJsonSchema.throw("symbolKey", ctx),
		unit: ctx => ToJsonSchema.throw("unit", ctx),
		date: ctx => ToJsonSchema.throw("date", ctx)
	}
}

export const ToJsonSchema = {
	Error: ToJsonSchemaError,
	throw: (...args: ConstructorParameters<typeof ToJsonSchemaError>): never => {
		throw new ToJsonSchema.Error(...args)
	},
	throwInternalOperandError: (
		kind: ConstraintKind,
		schema: JsonSchema
	): never =>
		throwInternalError(
			`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
		),
	defaultConfig
}

export declare namespace ToJsonSchema {
	export type Unjsonifiable = object | symbol | bigint | undefined

	export type Error = InstanceType<typeof ToJsonSchema.Error>

	export interface BaseContext<
		code extends Code,
		base extends JsonSchema = JsonSchema
	> {
		code: code
		base: base
	}

	export interface ArrayObjectContext
		extends BaseContext<"arrayObject", JsonSchema.Array> {
		object: JsonSchema.Object
	}

	export interface ArrayPostfixContext
		extends BaseContext<"arrayPostfix", VariadicArraySchema> {
		elements: readonly JsonSchema[]
	}

	export interface DefaultContext extends BaseContext<"default", JsonSchema> {
		value: Unjsonifiable
	}

	export interface DomainContext extends BaseContext<"domain", JsonSchema> {
		domain: satisfy<Domain, "symbol" | "bigint" | "undefined">
	}

	export interface MorphContext extends BaseContext<"morph", JsonSchema> {
		out: JsonSchema | null
	}

	export interface PatternIntersectionContext
		extends BaseContext<"patternIntersection", StringSchemaWithPattern> {
		pattern: string
	}

	export interface PredicateContext
		extends BaseContext<"predicate", JsonSchema> {
		predicate: Predicate
	}

	export interface ProtoContext extends BaseContext<"proto", JsonSchema> {
		proto: Constructor
	}

	export type SymbolKeyContext =
		| IndexSymbolKeyContext
		| RequiredSymbolKeyContext
		| OptionalSymbolKeyContext

	interface IndexSymbolKeyContext
		extends BaseContext<"symbolKey", JsonSchema.Object> {
		key: null
		value: JsonSchema
		optional: false
	}

	interface RequiredSymbolKeyContext
		extends BaseContext<"symbolKey", JsonSchema.Object> {
		key: symbol
		value: JsonSchema
		optional: false
	}

	interface OptionalSymbolKeyContext
		extends BaseContext<"symbolKey", JsonSchema.Object> {
		key: symbol
		value: JsonSchema
		optional: true
		default?: Json
	}

	export interface UnitContext extends BaseContext<"unit", JsonSchema> {
		unit: Unjsonifiable
	}

	export interface DateContext extends BaseContext<"date", JsonSchema> {
		before?: Date
		after?: Date
	}

	export interface ContextByCode {
		arrayObject: ArrayObjectContext
		arrayPostfix: ArrayPostfixContext
		default: DefaultContext
		domain: DomainContext
		morph: MorphContext
		patternIntersection: PatternIntersectionContext
		predicate: PredicateContext
		proto: ProtoContext
		symbolKey: SymbolKeyContext
		unit: UnitContext
		date: DateContext
	}

	export type Code = keyof ContextByCode

	export type FallbackContext = ContextByCode[Code]

	export type HandlerByCode = satisfy<
		{ [code in Code]: (ctx: ContextByCode[code]) => unknown },
		{
			arrayObject: (ctx: ArrayObjectContext) => JsonSchema.Structure
			arrayPostfix: (ctx: ArrayPostfixContext) => VariadicArraySchema
			default: (ctx: DefaultContext) => JsonSchema
			domain: (ctx: DomainContext) => JsonSchema
			morph: (ctx: MorphContext) => JsonSchema
			patternIntersection: (
				ctx: PatternIntersectionContext
			) => JsonSchema.String
			predicate: (ctx: PredicateContext) => JsonSchema
			proto: (ctx: ProtoContext) => JsonSchema
			symbolKey: (ctx: SymbolKeyContext) => JsonSchema.Object
			unit: (ctx: UnitContext) => JsonSchema
			date: (ctx: DateContext) => JsonSchema
		}
	>

	export type VariadicArraySchema = requireKeys<JsonSchema.Array, "items">

	export type StringSchemaWithPattern = requireKeys<
		JsonSchema.String,
		"pattern"
	>

	export type UniversalFallback = (ctx: FallbackContext) => JsonSchema

	export interface FallbackObject extends Partial<HandlerByCode> {
		universal?: UniversalFallback
	}

	export type FallbackOption = UniversalFallback | FallbackObject

	export interface Options {
		/** value to assign to the generated $schema key
		 *
		 *  - set to `null` to omit the `$schema` key
		 *  - does not affect the contents of the generated schema
		 *
		 * @default "https://json-schema.org/draft/2020-12/schema"
		 */
		dialect?: string | null
		fallback?: FallbackOption
	}

	export interface Context extends Required<Options> {
		fallback: HandlerByCode
	}
}
