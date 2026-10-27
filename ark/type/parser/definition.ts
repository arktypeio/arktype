import {
	$ark,
	constraintInputOf,
	hasArkKind,
	inProgress,
	type BaseParseContext,
	type BaseRoot,
	type BaseScope,
	type StandardSchemaV1
} from "@ark/schema"
import {
	domainOf,
	hasDomain,
	isArray,
	isStandardSchema,
	isThunk,
	objectKindOf,
	printable,
	throwError,
	throwParseError,
	uncapitalize,
	type anyOrNever,
	type array,
	type Dict,
	type ErrorMessage,
	type Fn,
	type ifEmptyObjectLiteral,
	type inferred,
	type objectKindOrDomainOf,
	type Primitive
} from "@ark/util"
import type { Out } from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { InnerParseResult } from "../scope.ts"
import type { instantiateType } from "../variants/instantiate.ts"
import type { ObjectType } from "../variants/object.ts"
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

const parseCache = new WeakMap<BaseScope, Record<string, InnerParseResult>>()

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
		let scopeCache = parseCache.get(ctx.$)
		if (!scopeCache) {
			scopeCache = Object.create(null) as Record<string, InnerParseResult>
			parseCache.set(ctx.$, scopeCache)
		}
		if (scopeCache[def]) {
			$ark.reached?.cached(scopeCache, def)
			return scopeCache[def]
		}
		const mark = $ark.reached?.mark()
		const result = parseString(def, ctx)
		const node = isArray(result) ? result[0] : result
		if (!inProgress.definitions || !node.hasAlias) {
			scopeCache[def] = result
			$ark.reached?.store(mark, scopeCache, def)
		}
		return result
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
			if (isStandardSchema(def)) return parseStandardSchema(def as never, ctx)
			return parseObjectLiteral(def as Dict, ctx)
		case "Array":
			return parseTuple(def as array, ctx)
		case "RegExp":
			return ctx.$.node(
				"intersection",
				{
					domain: ctx.$.node("domain", { domain: "string" }),
					pattern: [
						ctx.$.node("pattern", constraintInputOf("pattern", def as RegExp))
					]
				},
				{ prereduced: true }
			)
		case "Function": {
			// e.g. Effect's standardSchemaV1, a class that can't be called as a thunk
			if (isStandardSchema(def)) return parseStandardSchema(def as never, ctx)
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
		const result = def["~standard"].validate(v)

		if (result instanceof Promise) {
			return throwError(
				writeAsyncStandardSchemaMessage(def["~standard"].vendor)
			)
		}

		if (!result.issues) return result.value

		// a result with issues fails, even if they're empty
		if (result.issues.length === 0) return ctx.error({ problem: "is invalid" })

		for (const issue of result.issues) {
			ctx.error({
				problem: uncapitalize(issue.message),
				relativePath: (issue.path ?? []).map(k =>
					typeof k === "object" ? k.key : k
				)
			})
		}
	})

export const writeAsyncStandardSchemaMessage = (vendor: string): string =>
	`Standard Schema definitions must validate synchronously (${vendor} returned a Promise)`

export type inferDefinition<def, $, args> =
	[def] extends [anyOrNever] ? def
	: def extends type.cast<infer t> ?
		// a Type's [inferred] is required, but type.cast's is optional, and
		// inferring through it drops undefined without exactOptionalPropertyTypes
		def extends { [inferred]: infer t } ? t
		: // {} as a def is handled here since according to TS it extends { " arkInferred"?: t  }.
		// Unlike in TS however, ArkType object literals are constrained to object
		// so we use that as the base type inferred when parsing {}.
		unknown extends t ? ifEmptyObjectLiteral<def, object, t>
		: t
	: def extends ThunkCast<infer t> ? t
	: def extends string ? inferString<def, $, args>
	: def extends array ? inferTuple<def, $, args>
	: def extends RegExp ? string
	: def extends StandardSchemaV1 ? inferStandardSchema<def>
	: def extends object ? inferObjectLiteral<def, $, args>
	: never

// a literal without a spread is an object, so inference can be deferred
export type instantiateDefinition<def, $, args> =
	[def] extends [anyOrNever | string | NonLiteralObjectDefinition] ?
		instantiateType<inferDefinition<def, $, args>, $>
	: [def] extends [object] ?
		"..." extends keyof def ? instantiateType<inferDefinition<def, $, args>, $>
		: isSingleDefinition<def> extends true ?
			ObjectType<inferObjectLiteral<def, $, args>, $>
		:	instantiateType<inferDefinition<def, $, args>, $>
	:	instantiateType<inferDefinition<def, $, args>, $>

type NonLiteralObjectDefinition =
	| type.cast<unknown>
	| ThunkCast
	| array
	| RegExp
	| StandardSchemaV1

type isSingleDefinition<def, original = def> =
	def extends unknown ?
		[original] extends [def] ?
			true
		:	false
	:	never

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
	def extends TerminalObjectDefinition ? def
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
export type TerminalObjectDefinition =
	| type.cast<unknown>
	| Fn
	| RegExp
	| StandardSchemaV1

export type ThunkCast<t = unknown> = () => type.cast<t>

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
	actual: actual
): writeBadDefinitionTypeMessage<actual> =>
	`Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
	`Type definitions must be strings or objects (was ${actual})`
