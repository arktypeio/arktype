import {
	hasArkKind,
	type BaseParseContext,
	type BaseRoot,
	type StandardSchemaV1
} from "@ark/schema"
import {
	domainOf,
	hasDomain,
	isThunk,
	objectKindOf,
	printable,
	throwParseError,
	uncapitalize,
	type anyOrNever,
	type array,
	type Dict,
	type ErrorMessage,
	type Fn,
	type ifEmptyObjectLiteral,
	type objectKindOrDomainOf,
	type Primitive
} from "@ark/util"
import type { Out } from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { InnerParseResult } from "../scope.ts"
import type {
	shallowDefaultableMessage,
	shallowOptionalMessage,
	validateString
} from "./ast/validate.ts"
import {
	parseObjectLiteral,
	type inferObjectLiteral,
	type validateObjectLiteral
} from "./objectLiteral.ts"
import type { isDefaultable, OptionalPropertyDefinition } from "./property.ts"
import {
	parseString,
	type BaseCompletions,
	type inferString
} from "./string.ts"
import {
	maybeParseTupleExpression,
	type inferTupleExpression,
	type maybeValidateTupleExpression,
	type TupleExpression
} from "./tupleExpressions.ts"
import {
	parseTupleLiteral,
	type inferTupleLiteral,
	type validateTupleLiteral
} from "./tupleLiteral.ts"

const parseCache: {
	[cacheId: string]: { [def: string]: InnerParseResult } | undefined
} = {}

export const parseInnerDefinition = (
	def: unknown,
	ctx: BaseParseContext
): InnerParseResult => {
	if (typeof def === "string") {
		if (ctx.args && Object.keys(ctx.args).some(k => def.includes(k))) {
			// we can only rely on the cache if there are no contextual
			// resolutions like "this" or generic args
			return parseString(def, ctx)
		}
		const scopeCache = (parseCache[ctx.$.name] ??= {})
		return (scopeCache[def] ??= parseString(def, ctx))
	}
	return hasDomain(def, "object") ?
			parseObject(def, ctx)
		:	throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
}

export const parseObject = (def: object, ctx: BaseParseContext): BaseRoot => {
	const objectKind = objectKindOf(def)
	switch (objectKind) {
		case undefined:
			if (hasArkKind(def, "root")) return def
			if ("~standard" in def) return parseStandardSchema(def as never, ctx)
			return parseObjectLiteral(def as Dict, ctx)
		case "Array":
			return parseTuple(def as array, ctx)
		case "RegExp":
			return ctx.$.node(
				"intersection",
				{
					domain: "string",
					pattern: def as RegExp
				},
				{ prereduced: true }
			)
		case "Function": {
			const resolvedDef = isThunk(def) ? def() : def
			if (hasArkKind(resolvedDef, "root")) return resolvedDef
			return throwParseError(writeBadDefinitionTypeMessage("Function"))
		}
		default:
			return throwParseError(
				writeBadDefinitionTypeMessage(objectKind ?? printable(def))
			)
	}
}

const parseStandardSchema = (
	def: StandardSchemaV1,
	ctx: BaseParseContext
): BaseRoot =>
	ctx.$.intrinsic.unknown.pipe((v, ctx) => {
		const result = def["~standard"].validate(
			v
		) as StandardSchemaV1.Result<unknown>

		if (!result.issues) return result.value

		for (const { message, path } of result.issues) {
			if (path) {
				if (path.length) {
					ctx.error({
						problem: uncapitalize(message),
						relativePath: path.map(k => (typeof k === "object" ? k.key : k))
					})
				} else {
					ctx.error({
						message
					})
				}
			} else {
				ctx.error({
					message
				})
			}
		}
	})

export type inferDefinition<def, $, args> =
	[def] extends [anyOrNever] ? def
	: def extends type.cast<infer t> ?
		// {} as a def is handled here since according to TS it extends { " arkInferred"?: t  }.
		// Unlike in TS however, ArkType object literals are constrained to object
		// so we use that as the base type inferred when parsing {}.
		ifEmptyObjectLiteral<def, object, t>
	: def extends ThunkCast<infer t> ? t
	: def extends string ? inferString<def, $, args>
	: def extends array ? inferTuple<def, $, args>
	: def extends RegExp ? string
	: def extends StandardSchemaV1 ? inferStandardSchema<def>
	: def extends object ? inferObjectLiteral<def, $, args>
	: never

type inferStandardSchema<
	schema extends StandardSchemaV1,
	i = StandardSchemaV1.InferInput<schema>,
	o = StandardSchemaV1.InferOutput<schema>
> = [i, o] extends [o, i] ? i : (In: i) => Out<o>

// validates a shallow definition, ensuring it does not represent an optional or
// defaultable before drilling down further. a definition is shallow if it is either...

// 1. the root value passed to type()
// 2. a tuple expression
export type validateDefinition<def, $, args> =
	null extends undefined ?
		ErrorMessage<`'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`>
	: [def] extends [anyOrNever] ? def
	: def extends OptionalPropertyDefinition ?
		ErrorMessage<shallowOptionalMessage>
	: isDefaultable<def, $, args> extends true ?
		ErrorMessage<shallowDefaultableMessage>
	:	validateInnerDefinition<def, $, args>

// validates the definition without checking for optionals/defaults this should
// be used when one of these is true...

// 1. we are validating a shallow definition and have already ensured it does not
//    represent an optional or defaultable
// 2. we are validating the root of a property definition
export type validateInnerDefinition<def, $, args> =
	[def] extends [Terminal] ? def
	: def extends string ? validateString<def, $, args>
	: unknown extends def ?
		// this allows the initial list of autocompletions to be populated when a user writes "type()",
		// before having specified a definition
		BaseCompletions<$, args> | {}
	: def extends readonly unknown[] ? validateTuple<def, $, args>
	: def extends BadDefinitionType ?
		ErrorMessage<writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>>
	:	validateObjectLiteral<def, $, args>

export const parseTuple = (def: array, ctx: BaseParseContext): BaseRoot =>
	maybeParseTupleExpression(def, ctx) ?? parseTupleLiteral(def, ctx)

export type validateTuple<def extends array, $, args> =
	maybeValidateTupleExpression<def, $, args> extends infer result ?
		result extends null ?
			validateTupleLiteral<def, $, args>
		:	result
	:	never

export type inferTuple<def extends array, $, args> =
	def extends TupleExpression ? inferTupleExpression<def, $, args>
	:	inferTupleLiteral<def, $, args>

// functions are ignored in validation so that cyclic thunk definitions can be
// inferred in scopes
type Terminal = type.cast<unknown> | Fn | RegExp | StandardSchemaV1

export type ThunkCast<t = unknown> = () => type.cast<t>

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
	actual: actual
): writeBadDefinitionTypeMessage<actual> =>
	`Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
	`Type definitions must be strings or objects (was ${actual})`
