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
	readonly code: code
	readonly context: ToJsonSchema.ContextByCode[code]

	constructor(code: code, context: ToJsonSchema.ContextByCode[code]) {
		super(printable(context, { quoteKeys: false, indent: 4 }))
		this.code = code
		this.context = context
		this.name = `ToJsonSchemaError<"${this.code}">`
	}

	hasCode<code extends ToJsonSchema.Code>(
		code: code
	): this is ToJsonSchemaError<code> {
		return this.code === (code as never)
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
		)
}

export declare namespace ToJsonSchema {
	export type Unjsonifiable = object | symbol | bigint | undefined

	export type Error = InstanceType<typeof ToJsonSchema.Error>

	export interface BaseContext<base extends JsonSchema = JsonSchema> {
		base: base
	}

	export interface ArrayObjectContext extends BaseContext<JsonSchema.Array> {
		object: JsonSchema.Object
	}

	export interface ArrayPostfixContext
		extends BaseContext<VariadicArraySchema> {
		elements: readonly JsonSchema[]
	}

	export interface DefaultContext extends BaseContext<JsonSchema> {
		value: Unjsonifiable
	}

	export interface DomainContext extends BaseContext {
		domain: satisfy<Domain, "symbol" | "bigint" | "undefined">
	}

	export interface MorphContext extends BaseContext {
		out: JsonSchema
	}

	export interface PatternIntersectionContext
		extends BaseContext<StringSchemaWithPattern> {
		pattern: string
	}

	export interface PredicateContext extends BaseContext<JsonSchema> {
		predicate: Predicate
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

	export interface UnitContext extends BaseContext {
		unit: Unjsonifiable
	}

	export interface DateContext extends BaseContext {
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

	export interface Options {
		/** value to assign to the generated $schema key
		 *
		 *  - set to `null` to omit the `$schema` key
		 *  - does not affect the contents of the generated schema
		 *
		 * @default "https://json-schema.org/draft/2020-12/schema"
		 */
		dialect?: string | null
		fallback?: Partial<HandlerByCode>
	}

	export interface Context extends Required<Options> {
		fallback: HandlerByCode
	}
}
