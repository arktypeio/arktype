import {
	$ark,
	asTemplated,
	BaseRoot,
	constraintInputOf,
	hasArkKind,
	foreignTypesByMorph,
	inProgress,
	type BaseParseContext,
	type Traversal,
	type BaseScope,
	type StandardSchemaV1
} from "@ark/schema"
import {
	domainOf,
	hasDomain,
	hasOwn,
	isArray,
	isInstanceOf,
	isStandardSchema,
	isThunk,
	objectKindOf,
	printable,
	throwError,
	throwParseError,
	type anyOrNever,
	type array,
	type Constructor,
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
			if (hasArkKind(def, "root")) {
				return isInstanceOf(def, BaseRoot) ? def : (
						parseStandardSchema(def as never, ctx, true)
					)
			}
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
				{ reduced: true }
			)
		case "Function": {
			// e.g. Effect's standardSchemaV1, a class that can't be called as a thunk
			if (isStandardSchema(def)) return parseStandardSchema(def as never, ctx)
			const resolvedDef = isThunk(def) ? resolveThunk(def) : def
			if (hasArkKind(resolvedDef, "root")) return parseObject(resolvedDef, ctx)
			return throwParseError(writeBadDefinitionTypeMessage("Function"))
		}
		default:
			return throwParseError(
				writeBadDefinitionTypeMessage(objectKind ?? printable(def))
			)
	}
}

// a class whose constructor takes nothing reads as a thunk, and calling it
// would throw a TypeError in place of the message a class gets. One written
// as a class is told by its source, without reading any of its properties.
// One the engine implements, like Map, has no source, as a bound thunk has
// none, so it's told by the TypeError calling it throws. What a thunk with
// source of its own throws is its author's to read
const resolveThunk = (def: Fn): unknown => {
	const source = Function.prototype.toString.call(def)
	if (/^class\b/.test(source)) return def
	if (!/\[native code]\s*}$/.test(source)) return def()
	try {
		return def()
	} catch (e) {
		if (e instanceof TypeError) return def
		throw e
	}
}

// a Type from another copy of arktype, like 2.x, is foreign: it has its
// arkKind but not its methods, so it validates through its Standard Schema
const parseStandardSchema = (
	def: StandardSchemaV1,
	ctx: BaseParseContext,
	isForeign?: true
): BaseRoot => {
	const validate = (v: unknown, ctx: Traversal) => {
		const result = def["~standard"].validate(v)

		if (result instanceof Promise) {
			return throwError(
				writeAsyncStandardSchemaMessage(def["~standard"].vendor)
			)
		}

		if (!result.issues) return result.value

		// a result with issues fails, even if they're empty
		if (result.issues.length === 0)
			return ctx.error({ expected: "valid", message: "is invalid" })

		// read as it fails, since parsing reads nothing of a definition
		const { vendor, _c: isCustomError } = def["~standard"] as ArkWrittenProps
		const fromArk = vendor === "arktype"
		for (const issue of result.issues) {
			const relativePath = (issue.path ?? []).map(k =>
				typeof k === "object" ? k.key : k
			)
			// an arktype 2 message starts with the path its issue already has, so
			// its problem is read
			const { problem, _c, _l, _m } = issue as ArkWrittenIssue
			const fromArk2 = isForeign && typeof problem === "string"
			const error = ctx.error({
				message: fromArk2 ? problem : issue.message,
				relativePath
			})
			// another library's message is a sentence of its own, unlike what
			// arktype wrote from what it expected. Which it is isn't this copy's
			// to tell, as another's errors keep that to themselves: a standalone
			// validator's issue says, and a Type answers for its own
			if (
				fromArk2 ||
				(fromArk && _c === undefined && !isCustomError?.(issue))
			) {
				asTemplated(
					error,
					// a union listing its branches' errors names their whole paths
					_m ? _m.call(issue, ctx.path)._l
					: ctx.path.length === 0 ? _l
					: undefined
				)
			}
		}
	}
	if (isForeign) foreignTypesByMorph.set(validate, def)
	return ctx.$.intrinsic.unknown.pipe(validate)
}

// what an issue arktype wrote says beyond Standard Schema's: 2.x's message
// without its path, and 3's how its message was configured, where a
// standalone validator wrote it, the line of a union listing its errors and
// that line from a path before its own
type ArkWrittenIssue = {
	problem?: unknown
	_c?: unknown
	_l?: string
	_m?: (prefix: array<PropertyKey>) => { _l?: string }
}

// a Type's props also answer whether an issue of its own is custom
type ArkWrittenProps = StandardSchemaV1.Props & {
	_c?: (issue: object) => boolean
}

export const writeAsyncStandardSchemaMessage = (vendor: string): string =>
	`Standard Schema definitions must validate synchronously (${vendor} returned a Promise)`

export type inferDefinition<def, $, args> =
	[def] extends [anyOrNever] ? def
	: def extends type.cast<infer t> ?
		// type.cast's [inferred] is optional, so inferring through it drops
		// undefined without exactOptionalPropertyTypes
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

/**
 * {@link validateDefinition} as the type of a parameter (`type.validate`),
 * written so that completing a string passed directly to `type()` stays fast.
 * Once `def` is resolved it is exactly `validateDefinition<def, $, args>`.
 *
 * To complete a string argument, TypeScript first resolves the call with
 * inference blocked from that string, which it does by inferring from the
 * parameter's type to itself. Wherever that meets the same alias on both sides
 * with `def` among its arguments, it asks for the alias's variance, and the
 * variance of a conditional type is measured by comparing instantiations of it,
 * which recurses into every alias the validator can reach. An editor rebuilds
 * the checker on each edit, so that was paid on every keystroke: 650ms a
 * completion on TypeScript 6 and 200ms on 7, for a call that checks in a few.
 * `completions.test.ts` bounds the instantiations a completion costs. TypeScript
 * 5.1 has no such pass, so nothing changes there.
 *
 * Each part of this is there for that pass:
 *
 * - Two references to one interface are inferred through their type arguments,
 *   and variance annotated `in out` is read rather than measured, so nothing
 *   behind {@link DefinitionArgument} is visited. Without the annotations a
 *   completion still takes 300ms.
 * - The index is deferred while `def` is generic and is `"validated"` once
 *   it's resolved. Indexed by the literal, the interface would be replaced by
 *   its property where this alias is declared.
 * - That hides the validator from ordinary inference too, which needs two
 *   things from it, so they are the false branch, which is never the result:
 *   `def` itself, and a mapped type over `keyof def`, through which TypeScript
 *   infers what it can of a definition containing a function it has yet to
 *   contextually type, like the morph of `["string", "=>", s => s.length]`.
 * - The first check is resolved where this alias is declared, so its
 *   instantiations aren't recorded as this alias's. If they were, its own
 *   variance would be measured, which compares the validator after all.
 */
export type validateDefinitionArgument<def, $, args> =
	null extends undefined ? validateDefinition<def, $, args>
	: [def] extends [unknown] ?
		DefinitionArgument<def, $, args>[def extends unknown ? "validated" : never]
	: [def] extends [anyOrNever] ? def
	: { [k in keyof def]: validateDefinitionArgument<def[k], $, args> }

export interface DefinitionArgument<in out def, in out $, in out args> {
	validated: validateDefinition<def, $, args>
}

// validates the definition without checking for optionals/defaults this should
// be used when one of these is true...

// 1. we are validating a shallow definition and have already ensured it does not
//    represent an optional or defaultable
// 2. we are validating the root of a property definition
export type validateInnerDefinition<def, $, args> =
	def extends TerminalObjectDefinition ? validateTerminalObject<def>
	: def extends string ? validateString<def, $, args>
	: unknown extends def ?
		// this allows the initial list of autocompletions to be populated when a user writes "type()",
		// before having specified a definition
		BaseCompletions<$, args> | {}
	: def extends readonly unknown[] ? validateTuple<def, $, args>
	: def extends BadDefinitionType ?
		ErrorMessage<writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>>
	: def extends Constructor ?
		ErrorMessage<writeBadDefinitionTypeMessage<"Function">>
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

// a class like `Date` is an error here, as it is at runtime, unless it's a
// Standard Schema, like Effect's. Any other function passes unread: reading one
// to tell a predicate from a thunk would resolve the return type of a thunk
// that refers to its own scope, which is a cycle
type validateTerminalObject<def> =
	def extends Constructor ?
		def extends StandardSchemaV1 ?
			def
		:	ErrorMessage<writeBadDefinitionTypeMessage<"Function">>
	:	def

export type ThunkCast<t = unknown> = () => type.cast<t>

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
	actual: actual
): writeBadDefinitionTypeMessage<actual> =>
	`Type definitions must be strings or objects (was ${actual})${
		(hasOwn(badDefinitionHints, actual) ?
			badDefinitionHints[actual as never]
		:	"") as never
	}`

type writeBadDefinitionTypeMessage<actual extends string> =
	`Type definitions must be strings or objects (was ${actual})${actual extends (
		keyof badDefinitionHints
	) ?
		badDefinitionHints[actual]
	:	""}`

// without double quotes, which a type error would print escaped
const literalValueHint =
	". Write a literal value in a string, or pass it to type.unit()"

// what to write instead, by what the definition was
const badDefinitionHints = {
	Function:
		". Write a class as type.instanceOf(MyClass) or a keyword like Date, and a predicate as .narrow(fn)",
	number: literalValueHint,
	bigint: literalValueHint,
	boolean: literalValueHint,
	null: literalValueHint,
	undefined: literalValueHint,
	symbol: literalValueHint
} as const

type badDefinitionHints = typeof badDefinitionHints
