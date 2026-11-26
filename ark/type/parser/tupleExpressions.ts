import {
	Disjoint,
	type arkKind,
	type BaseParseContext,
	type BaseRoot,
	type GenericAst,
	type GenericParamAst,
	type Morph,
	type NodeSelector,
	type Predicate,
	type PrivateDeclaration,
	type StandardSchemaV1,
	type TypeMeta,
	type unwrapDefault
} from "@ark/schema"
import {
	hasOwn,
	objectKindOrDomainOf,
	throwParseError,
	type anyOrNever,
	type array,
	type Brand,
	type BuiltinObjectKind,
	type Constructor,
	type Domain,
	type ErrorMessage,
	type Fn,
	type Hkt,
	type inferred,
	type intersectUnion,
	type Primitive,
	type Scanner,
	type show
} from "@ark/util"
import { intersectNodesRoot, pipeNodesRoot } from "arksets/internal"
import type {
	defaultFor,
	distill,
	inferIntersection,
	inferMorphOut,
	inferPipe,
	inferPredicate,
	Out,
	withDefault
} from "../attributes.ts"
import type { AmbientKey } from "../config.ts"
import type { type } from "../keywords/keywords.ts"
import type { bindThis, UnparsedScope } from "../scope.ts"
import {
	shallowDefaultableMessage,
	shallowOptionalMessage
} from "./ast/validate.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import {
	checkWrittenIntersection,
	type BranchOperator
} from "./reduce/shared.ts"
import { writeMissingRightOperandMessage } from "./shift/operand/unenclosed.ts"
import type { InfixToken, TerminatingChar } from "./shift/tokens.ts"
import type { BaseCompletions } from "./string.ts"

export const maybeParseTupleExpression = (
	def: array,
	ctx: BaseParseContext
): BaseRoot | null =>
	isIndexZeroExpression(def) ? indexZeroParsers[def[0]](def as never, ctx)
	: isIndexOneExpression(def) ? indexOneParsers[def[1]](def as never, ctx)
	: null

export type maybeValidateTupleExpression<def extends array, $, args> =
	def extends IndexZeroExpression ? validatePrefixExpression<def, $, args>
	: def extends IndexOneExpression ? validateIndexOneExpression<def, $, args>
	: def extends (
		readonly ["", ...unknown[]] | readonly [unknown, "", ...unknown[]]
	) ?
		readonly [
			def[0] extends "" ? BaseCompletions<$, args, IndexZeroOperator | "...">
			:	def[0],
			def[1] extends "" ? BaseCompletions<$, args, IndexOneOperator | "...">
			:	def[1]
		]
	:	null

export type inferTupleExpression<def extends TupleExpression, $, args> =
	def[1] extends "[]" ? inferDefinition<def[0], $, args>[]
	: def[1] extends "?" ? inferDefinition<def[0], $, args>
	: def[1] extends "&" ?
		inferIntersection<
			inferDefinition<def[0], $, args>,
			inferDefinition<def[2], $, args>
		>
	: def[1] extends "|" ?
		inferDefinition<def[0], $, args> | inferDefinition<def[2], $, args>
	: def[1] extends ":" ?
		inferPredicate<inferDefinition<def[0], $, args>, def[2]>
	: def[1] extends "=>" ? parseMorph<def[0], def[2], $, args>
	: def[1] extends "|>" ? parseTo<def[0], def[2], $, args>
	: def[1] extends "=" ?
		withDefault<inferDefinition<def[0], $, args>, unwrapDefault<def[2]>>
	: def[1] extends "@" ? inferDefinition<def[0], $, args>
	: def extends readonly ["===", ...infer values] ? values[number]
	: def extends (
		readonly ["instanceof", ...infer constructors extends Constructor[]]
	) ?
		InstanceType<constructors[number]>
	: def[0] extends "keyof" ? inferKeyOfExpression<def[1], $, args>
	: never

export type validatePrefixExpression<def extends IndexZeroExpression, $, args> =
	def["length"] extends 1 ?
		readonly [ErrorMessage<writeMissingRightOperandMessage<def[0]>>]
	: def[0] extends "keyof" ?
		readonly [def[0], validateDefinition<def[1], $, args>]
	: def[0] extends "===" ? readonly [def[0], ...unknown[]]
	: def[0] extends "instanceof" ? readonly [def[0], ...Constructor[]]
	: never

export type validateIndexOneExpression<
	def extends IndexOneExpression,
	$,
	args
> =
	def[1] extends TuplePostfixOperator ?
		// use type.validate here since optional/defaultables are not allowed
		// within tuple expressions
		readonly [validateDefinition<def[0], $, args>, def[1]]
	:	readonly [
			validateDefinition<def[0], $, args>,
			def["length"] extends 2 ?
				ErrorMessage<writeMissingRightOperandMessage<def[1]>>
			:	def[1],
			def[1] extends "|" ? validateDefinition<def[2], $, args>
			: def[1] extends "&" ? validateDefinition<def[2], $, args>
			: def[1] extends ":" ? Predicate<contextualInputOf<def[0], $, args>>
			: def[1] extends "=>" ? Morph<contextualInputOf<def[0], $, args>>
			: def[1] extends "|>" ? validateDefinition<def[2], $, args>
			: def[1] extends "=" ? defaultFor<type.infer.In<def[0], $, args>>
			: def[1] extends "@" ? TypeMeta.MappableInput
			: validateDefinition<def[2], $, args>,
			...(def[1] extends "@" ? [NodeSelector?] : [])
		]

// Detach unparsed object literals in def[0], reachable $ entries, and args from
// TypeScript's ReverseMapped inference wrappers before contextually typing a
// tuple morph ("=>") or predicate (":"). Without this, an inferred object input
// carries a lazy mapper referencing the enclosing ReverseMapped `def`, which
// fixes `def` during contextual signature instantiation while the callback's
// return type is still `unknown` (#1624). Limiting detachment to aliases
// reachable from def[0] avoids evaluating unrelated self-referencing thunk
// aliases in the same scope, and fast-pathing string inputs in empty scopes
// keeps tuple-morph instantiation budgets unchanged.
type contextualInputOf<inDef, $, args> =
	inDef extends string ?
		[keyof $] extends [never] ?
			type.infer.Out<inDef, $, detachArgsFor<inDef, args>>
		:	type.infer.Out<inDef, detachScopeFor<inDef, $>, detachArgsFor<inDef, args>>
	:	type.infer.Out<
			detachDef<inDef>,
			detachScopeFor<inDef, $>,
			detachArgsFor<inDef, args>
		>

type DetachedEntry<k extends PropertyKey, v> = { [p in k]: v }

type LeafDefinition =
	| Primitive
	| Fn
	| Constructor<unknown>
	| RegExp
	| StandardSchemaV1

type detachTuple<def extends readonly unknown[]> =
	def extends readonly ["instanceof" | "===", ...unknown[]] ? def
	: def extends (
		readonly [
			infer inner,
			infer op extends "@" | "=" | ":" | "=>",
			...infer rest
		]
	) ?
		readonly [detachDef<inner>, op, ...rest]
	: def extends readonly [infer head, ...infer tail] ?
		readonly [detachDef<head>, ...detachTuple<tail>]
	:	[]

type detachDef<def> =
	[def] extends [anyOrNever] ? def
	: def extends LeafDefinition ? def
	: def extends readonly unknown[] ?
		number extends def["length"] ?
			def
		:	detachTuple<def>
	: def extends object ?
		[keyof def] extends [never] ? def
		: inferred extends keyof def ? def
		: arkKind extends keyof def ? def
		: intersectUnion<
				keyof def extends infer k ?
					k extends keyof def ?
						DetachedEntry<k, k extends "@" | "+" ? def[k] : detachDef<def[k]>>
					:	never
				:	never
			>
	:	def

type stripGenericConstraints<params extends array<GenericParamAst>> =
	params extends (
		readonly [
			GenericParamAst<infer name>,
			...infer tail extends array<GenericParamAst>
		]
	) ?
		[[name, unknown], ...stripGenericConstraints<tail>]
	:	[]

type DetachedGeneric<
	params extends array<GenericParamAst>,
	bodyDef,
	$,
	arg$
> = GenericAst<params, bodyDef, $, arg$>

type detachResolution<v> =
	[v] extends [anyOrNever] ? v
	: v extends Brand<infer def, "unparsed"> ? Brand<detachDef<def>, "unparsed">
	: v extends (
		GenericAst<infer params, infer bodyDef, UnparsedScope, infer arg$>
	) ?
		bodyDef extends Hkt ?
			v
		:	DetachedGeneric<
				stripGenericConstraints<params>,
				detachDef<bodyDef>,
				UnparsedScope,
				arg$
			>
	:	v

type TokenSeparator = TerminatingChar | "(" | "]"

type normalizeToken<token extends string> =
	token extends "" ? never
	: token extends `${infer head}.${string}` ? token | head
	: token extends `${infer name}!` ? token | name
	: token

type skipQuoted<str extends string, quote extends "'" | '"' | "/"> =
	str extends `${infer before}\\${infer after}` ?
		before extends `${string}${quote}${string}` ?
			str extends `${string}${quote}${infer rest}` ?
				rest
			:	""
		: after extends `${infer s}${infer rest}` ? skipQuoted<rest, quote>
		: ""
	: str extends `${string}${quote}${infer rest}` ? rest
	: ""

type tokensOfString<s extends string> =
	s extends "" ? never
	: s extends `'${infer body}` ? tokensOfString<skipQuoted<body, "'">>
	: s extends `"${infer body}` ? tokensOfString<skipQuoted<body, '"'>>
	: s extends `/${infer body}` ? tokensOfString<skipQuoted<body, "/">>
	: s extends `${TokenSeparator}${infer rest}` ? tokensOfString<rest>
	: Scanner.shiftUntil<s, TokenSeparator> extends (
		Scanner.shiftResult<infer token, infer rest>
	) ?
		normalizeToken<token> | tokensOfString<rest>
	:	never

type matchingKeysInString<s extends string, scopeKey> =
	s extends scopeKey ? s
	: PrivateDeclaration<s> extends scopeKey ? PrivateDeclaration<s>
	: s extends `${string}${TokenSeparator | "."}${string}` ?
		matchingScopeKeys<tokensOfString<s>, scopeKey>
	:	never

type matchingKeysInTuple<def extends readonly unknown[], scopeKey> =
	def extends readonly ["instanceof" | "===", ...unknown[]] ? never
	: def extends readonly [infer inner, "@" | "=" | ":" | "=>", ...unknown[]] ?
		matchingKeysInDef<inner, scopeKey>
	: def extends readonly [infer head, ...infer tail] ?
		matchingKeysInDef<head, scopeKey> | matchingKeysInTuple<tail, scopeKey>
	:	never

type matchingKeysInDef<def, scopeKey> =
	[def] extends [anyOrNever] ? never
	: unknown extends def ? never
	: def extends string ? matchingKeysInString<def, scopeKey>
	: def extends LeafDefinition ? never
	: def extends readonly unknown[] ?
		number extends def["length"] ?
			never
		:	matchingKeysInTuple<def, scopeKey>
	: def extends object ?
		[keyof def] extends [never] ? never
		: inferred extends keyof def ? never
		: arkKind extends keyof def ? never
		: | matchingKeysInDef<def[Exclude<keyof def, "@" | "+">], scopeKey>
			| (keyof def extends infer k ?
					k extends `[${infer indexKey}]` ?
						matchingKeysInString<indexKey, scopeKey>
					:	never
			  :	never)
	:	never

type matchingKeysInResolution<v, scopeKey> =
	[v] extends [anyOrNever] ? never
	: v extends Brand<infer def, "unparsed"> ? matchingKeysInDef<def, scopeKey>
	: v extends GenericAst<any, infer bodyDef, UnparsedScope> ?
		bodyDef extends Hkt ?
			never
		:	matchingKeysInDef<bodyDef, scopeKey>
	:	never

type matchingScopeKeys<tokens extends string, scopeKey> = (
	| tokens
	| PrivateDeclaration<tokens>
) &
	scopeKey

type collectReachableKeys<frontier, $, seen = never> =
	[frontier] extends [never] ? seen
	:	collectReachableKeys<
			Exclude<
				matchingKeysInResolution<$[frontier & keyof $], keyof $>,
				seen | frontier
			>,
			$,
			seen | frontier
		>

type tupleContainsMorph<def extends readonly unknown[]> =
	def extends readonly ["instanceof" | "===", ...unknown[]] ? false
	: def extends readonly [infer inner, "@" | "=" | ":", ...unknown[]] ?
		defContainsMorph<inner>
	: def extends readonly [infer head, ...infer tail] ?
		defContainsMorph<head> extends true ?
			true
		:	tupleContainsMorph<tail>
	:	false

type defContainsMorph<def> =
	[def] extends [anyOrNever] ? false
	: unknown extends def ? false
	: def extends LeafDefinition ? false
	: def extends readonly [unknown, "=>", ...unknown[]] ? true
	: def extends readonly unknown[] ?
		number extends def["length"] ?
			false
		:	tupleContainsMorph<def>
	: def extends object ?
		[keyof def] extends [never] ? false
		: inferred extends keyof def ? false
		: arkKind extends keyof def ? false
		: true extends defContainsMorph<def[Exclude<keyof def, "@" | "+">]> ? true
		: false
	:	false

type resolutionContainsMorph<v> =
	[v] extends [anyOrNever] ? false
	: v extends Brand<infer def, "unparsed"> ? defContainsMorph<def>
	: v extends GenericAst<any, infer bodyDef, UnparsedScope> ?
		bodyDef extends Hkt ?
			false
		:	defContainsMorph<bodyDef>
	:	false

type isCyclicMorphKey<k, $> =
	k extends keyof $ ?
		resolutionContainsMorph<$[k]> extends true ?
			k extends (
				collectReachableKeys<matchingKeysInResolution<$[k], keyof $>, $>
			) ?
				true
			:	false
		:	false
	:	false

type detachScopeFor<def, $> =
	[$] extends [anyOrNever] ? $
	: [keyof $] extends [never] ? $
	: | collectReachableKeys<matchingKeysInDef<def, keyof $>, $>
	| (AmbientKey & keyof $) extends infer keys ?
		[keys] extends [never] ? {}
		: true extends isCyclicMorphKey<keys, $> ? $
		: intersectUnion<
				keys extends keyof $ ? DetachedEntry<keys, detachResolution<$[keys]>>
				:	never
			>
	:	never

type detachArgsFor<def, args> =
	[args] extends [anyOrNever] ? args
	: [keyof args] extends [never] ? args
	: args extends bindThis<infer thisDef> ?
		thisDef extends readonly unknown[] ? args
		: "this" extends matchingKeysInDef<def, "this"> ? args
		: {}
	:	args

export type UnparsedTupleExpressionInput = {
	instanceof: Constructor
	"===": unknown
}

export type UnparsedTupleOperator = show<keyof UnparsedTupleExpressionInput>

export const assertTupleArity = (
	def: array,
	operator: TupleExpressionOperator,
	min: number,
	max = min
): void => {
	if (def.length < min)
		throwParseError(writeMissingRightOperandMessage(operator, ""))
	if (def.length > max) {
		throwParseError(
			writeUnexpectedTupleElementsMessage(
				operator,
				min === max ? min : `${min} or ${max}`,
				def.length
			)
		)
	}
}

export const parseKeyOfTuple: IndexZeroParser<"keyof"> = (def, ctx) => {
	assertTupleArity(def, "keyof", 2)
	return ctx.$.parseOwn(def[1], ctx).keyof()
}

export type inferKeyOfExpression<operandDef, $, args> = show<
	keyof inferDefinition<operandDef, $, args>
>

const parseBranchTuple: IndexOneParser<BranchOperator> = (def, ctx) => {
	assertTupleArity(def, def[1], 3)
	if (def[2] === undefined)
		return throwParseError(writeMissingRightOperandMessage(def[1], ""))

	const l = ctx.$.parseOwn(def[0], ctx)
	const r = ctx.$.parseOwn(def[2], ctx)
	if (def[1] === "|") return ctx.$.node("union", { branches: [l, r] })
	const result =
		def[1] === "&" ?
			intersectNodesRoot(l, r, ctx.$)
		:	pipeNodesRoot(l, r, ctx.$)
	if (result instanceof Disjoint) return result.throw()
	if (def[1] === "&") checkWrittenIntersection(result, l, r)
	return result
}

const parseArrayTuple: IndexOneParser<"[]"> = (def, ctx) => {
	assertTupleArity(def, "[]", 2)
	return ctx.$.parseOwn(def[0], ctx).rawArray()
}

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type ArgTwoOperator = Exclude<IndexOneOperator, "?" | "=">

export const parseMorphTuple: IndexOneParser<"=>"> = (def, ctx) => {
	assertTupleArity(def, "=>", 3)
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage("=>", def[2])
		)
	}
	return ctx.$.parseOwn(def[0], ctx).pipe(def[2] as Morph)
}

export const writeMalformedFunctionalExpressionMessage = (
	operator: ":" | "=>",
	value: unknown
): string =>
	`${
		operator === ":" ? "Narrow" : "Morph"
	} expression requires a function following '${operator}' (was ${typeof value})`

export type parseTo<inDef, outDef, $, args> = inferPipe<
	inferDefinition<inDef, $, args>,
	inferDefinition<outDef, $, args>
>

export type parseMorph<inDef, morph, $, args> =
	morph extends Morph ?
		inferMorphOut<morph> extends infer out ?
			(In: distill.In<inferDefinition<inDef, $, args>>) => Out<out>
		:	never
	:	never

// a tuple's predicate is a .narrow(), so it checks the output, after any
// morphs and defaults, and a morph pipes to it
export const parseNarrowTuple: IndexOneParser<":"> = (def, ctx) => {
	assertTupleArity(def, ":", 3)
	if (typeof def[2] !== "function") {
		return throwParseError(
			writeMalformedFunctionalExpressionMessage(":", def[2])
		)
	}
	return ctx.$.parseOwn(def[0], ctx).rawConstrainOut(
		"predicate",
		def[2] as Predicate
	)
}

const parseMetaTuple: IndexOneParser<"@"> = (def, ctx) => {
	assertTupleArity(def, "@", 3, 4)
	return ctx.$.parseOwn(def[0], ctx).configure(
		def[2] as never,
		def[3] as NodeSelector
	)
}

export type IndexOneExpression<token extends string = IndexOneOperator> =
	readonly [unknown, token, ...unknown[]]

type IndexOneParser<token extends string> = (
	def: IndexOneExpression<token>,
	ctx: BaseParseContext
) => BaseRoot

const defineIndexOneParsers = <parsers>(parsers: {
	[k in keyof parsers & string]: IndexOneParser<k>
}) => parsers

const postfixParsers = defineIndexOneParsers({
	"[]": parseArrayTuple,
	"?": def => {
		assertTupleArity(def, "?", 2)
		return throwParseError(shallowOptionalMessage)
	}
})

export type TuplePostfixOperator = keyof typeof postfixParsers

const infixParsers = defineIndexOneParsers({
	"|": parseBranchTuple,
	"&": parseBranchTuple,
	":": parseNarrowTuple,
	"=>": parseMorphTuple,
	"|>": parseBranchTuple,
	"@": parseMetaTuple,
	// since object and tuple literals parse there via `parseProperty`,
	// they must be shallow if parsed directly as a tuple expression
	"=": def => {
		assertTupleArity(def, "=", 3)
		return throwParseError(shallowDefaultableMessage)
	}
})

export type TupleInfixOperator = keyof typeof infixParsers

const indexOneParsers = { ...postfixParsers, ...infixParsers }

export type IndexOneOperator = keyof typeof indexOneParsers

const isIndexOneExpression = (def: array): def is IndexOneExpression =>
	isOperatorOf(def[1], indexOneParsers)

export type InfixExpression = readonly [unknown, InfixToken, ...unknown[]]

type IndexZeroParser<token extends string> = (
	def: IndexZeroExpression<token>,
	ctx: BaseParseContext
) => BaseRoot

type IndexZeroExpression<token extends string = IndexZeroOperator> = readonly [
	token,
	...unknown[]
]

const defineIndexZeroParsers = <parsers>(parsers: {
	[k in keyof parsers & string]: IndexZeroParser<k>
}) => parsers

const indexZeroParsers = defineIndexZeroParsers({
	keyof: parseKeyOfTuple,
	instanceof: (def, ctx) => {
		if (typeof def[1] !== "function") {
			return throwParseError(
				writeInvalidConstructorMessage(objectKindOrDomainOf(def[1]))
			)
		}
		const branches = def
			.slice(1)
			.map(ctor =>
				typeof ctor === "function" ?
					ctx.$.node("proto", { proto: ctor as Constructor })
				:	throwParseError(
						writeInvalidConstructorMessage(objectKindOrDomainOf(ctor))
					)
			)
		return branches.length === 1 ?
				branches[0]
			:	ctx.$.node("union", { branches })
	},
	"===": (def, ctx) => ctx.$.units(def.slice(1))
})

export type IndexZeroOperator = keyof typeof indexZeroParsers

const isIndexZeroExpression = (def: array): def is IndexZeroExpression =>
	isOperatorOf(def[0], indexZeroParsers)

// a non-string element could run user code if coerced to a property key
const isOperatorOf = (element: unknown, parsers: object) =>
	typeof element === "string" && hasOwn(parsers, element)

export const writeInvalidConstructorMessage = <
	actual extends Domain | BuiltinObjectKind
>(
	actual: actual
): string =>
	`Expected a constructor following 'instanceof' operator (was ${actual})`

export const writeUnexpectedTupleElementsMessage = (
	operator: TupleExpressionOperator,
	expected: number | string,
	actual: number
): string =>
	`Tuple expression with operator '${operator}' requires ${expected} elements (got ${actual})`
