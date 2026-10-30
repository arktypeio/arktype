import type {
	arkKind,
	BaseParseContext,
	GenericAst,
	resolvableReferenceIn
} from "@ark/schema"
import {
	Scanner,
	throwInternalError,
	throwParseError,
	type anyOrNever,
	type Backslash,
	type BigintLiteral,
	type ErrorMessage,
	type NumberLiteral,
	type WhitespaceChar
} from "@ark/util"
import type { DateLiteral } from "../attributes.ts"
import type { ArkAmbient } from "../config.ts"
import type { InnerParseResult, resolutionToAst } from "../scope.ts"
import type { InferredAst, inferAstRoot } from "./ast/infer.ts"
import { RuntimeState, type RootedRuntimeState } from "./reduce/dynamic.ts"
import type {
	Comparator,
	InvertedComparators,
	MaxComparator,
	StringifiablePrefixOperator
} from "./reduce/shared.ts"
import type { s, StaticState } from "./reduce/static.ts"
import type { EnclosingQuote } from "./shift/operand/enclosed.ts"
import type { writeInvalidGenericArgCountMessage } from "./shift/operand/genericArgs.ts"
import type { parseOperand } from "./shift/operand/operand.ts"
import { parseDefault } from "./shift/operator/default.ts"
import {
	writeUnexpectedCharacterMessage,
	type parseOperator
} from "./shift/operator/operator.ts"

export const parseString = (
	def: string,
	ctx: BaseParseContext
): InnerParseResult => {
	const aliasResolution = ctx.$.maybeResolveRoot(def)
	if (aliasResolution) return aliasResolution

	if (def.endsWith("[]")) {
		const possibleElementResolution = ctx.$.maybeResolveRoot(def.slice(0, -2))
		if (possibleElementResolution) return possibleElementResolution.rawArray()
	}

	const s = new RuntimeState(new Scanner(def), ctx)

	const node = fullStringParse(s)

	if (s.finalizer === ">") throwParseError(writeUnexpectedCharacterMessage(">"))

	return node
}

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
export type parseString<def extends string, $, args> =
	def extends keyof $ ?
		$[def] extends GenericAst ?
			[$[def]] extends [anyOrNever] ?
				resolutionToAst<def, $[def]>
			:	ErrorMessage<
					writeInvalidGenericArgCountMessage<def, $[def]["names"], []>
				>
		:	resolutionToAst<def, $[def]>
	: def extends `${string}[]` ?
		def extends `${infer child}[]` ?
			child extends keyof $ ? [resolutionToAst<child, $[child]>, "[]"]
			: resolveAmbient<child, $> extends [unknown] ?
				parseAmbientReference<def, child, resolveAmbient<child, $>[0], $, args>
			:	parseNonReference<def, $, args>
		:	never
	: resolveAmbient<def, $> extends [unknown] ?
		parseAmbientReference<def, def, resolveAmbient<def, $>[0], $, args>
	:	parseNonReference<def, $, args>

type parseNonReference<def extends string, $, args> =
	def extends `${EnclosingQuote}${string}` ?
		parseQuotedToken<def> extends infer ast ?
			null extends ast ?
				parseExpression<def, $, args>
			:	ast
		:	never
	: def extends `${string}${" " | "|"}${string}` ? parseExpression<def, $, args>
	: def extends NumberLiteral | BigintLiteral ?
		parseOperandToken<def, $, args> extends infer ast ?
			null extends ast ?
				fullStringParse<s.initialize<def>, $, args>
			:	ast
		:	never
	:	fullStringParse<s.initialize<def>, $, args>

type parseExpression<def extends string, $, args> =
	def extends `${string}${"(" | "|>"}${string}` | `/${string}` ?
		fullStringParse<s.initialize<def>, $, args>
	: def extends `${string} = ${string}` ? parseDefaultExpression<def, $, args>
	: def extends `${string} | ${string}` ? parseSpacedUnion<def, def, $, args>
	: def extends `${string}|${string}` ? parseOperandUnion<def, def, $, args>
	: parseBoundedOperand<def, $, args>

// " = " starts a default only if what precedes it parses
type parseDefaultExpression<def extends string, $, args> =
	def extends `${infer base} = ${infer value}` ?
		parseString<base, $, args> extends (
			| ErrorMessage
			| readonly [unknown, "?" | "="]
			| readonly [unknown, "=", unknown]
		) ?
			fullStringParse<s.initialize<def>, $, args>
		:	parseDefault<parseString<base, $, args>, ` ${value}`>
	:	never

// wrapped so a generic def isn't distributed over keywords
type resolveAmbient<reference, $> =
	[reference] extends [keyof ArkAmbient.$] ? [ArkAmbient.$[reference]]
	: reference extends `${string}.${string}` ?
		reference extends `${infer submodule}.${infer name}` ?
			[submodule] extends [keyof $] ? null
			: [submodule] extends [keyof ArkAmbient.$] ?
				resolveSubmodule<ArkAmbient.$[submodule], name>
			:	null
		:	null
	:	null

type resolveSubmodule<submodule, reference> =
	submodule extends { [arkKind]: "module" } ?
		[reference] extends [keyof submodule] ? [submodule[reference]]
		: reference extends `${infer nested}.${infer name}` ?
			[nested] extends [keyof submodule] ?
				resolveSubmodule<submodule[nested], name>
			:	null
		:	null
	:	null

type parseAmbientReference<
	def extends string,
	reference extends string,
	resolution,
	$,
	args
> =
	[reference] extends [keyof args] ? fullStringParse<s.initialize<def>, $, args>
	: [resolution] extends [GenericAst] ?
		fullStringParse<s.initialize<def>, $, args>
	: def extends reference ? resolutionToAst<reference, resolution>
	: [resolutionToAst<reference, resolution>, "[]"]

// a union of plain operands is split on "|", and anything else is scanned
type parseOperandUnion<
	def extends string,
	unscanned extends string,
	$,
	args,
	union = undefined
> =
	unscanned extends `${infer head}|${infer tail}` ?
		parseOperandToken<trimSpaces<head>, $, args> extends infer ast ?
			null extends ast ?
				fullStringParse<s.initialize<def>, $, args>
			:	parseOperandUnion<
					def,
					tail,
					$,
					args,
					[union] extends [undefined] ? ast : [union, "|", ast]
				>
		:	never
	: parseOperandToken<trimSpaces<unscanned>, $, args> extends infer ast ?
		null extends ast ?
			fullStringParse<s.initialize<def>, $, args>
		:	[union, "|", ast]
	:	never

type parseSpacedUnion<
	def extends string,
	unscanned extends string,
	$,
	args,
	union = undefined
> =
	unscanned extends `${infer head} | ${infer tail}` ?
		parseOperandToken<head, $, args> extends infer ast ?
			null extends ast ?
				fullStringParse<s.initialize<def>, $, args>
			:	parseSpacedUnion<
					def,
					tail,
					$,
					args,
					[union] extends [undefined] ? ast : [union, "|", ast]
				>
		:	never
	: parseOperandToken<unscanned, $, args> extends infer ast ?
		null extends ast ?
			fullStringParse<s.initialize<def>, $, args>
		:	[union, "|", ast]
	:	never

// null unless token is a quoted string, number or reference tryResolve would resolve directly
type parseOperandToken<token extends string, $, args> =
	token extends `${string}[]` ?
		token extends `${infer child}[]` ?
			parseOperandToken<child, $, args> extends infer ast ?
				null extends ast ?
					null
				:	[ast, "[]"]
			:	never
		:	never
	: token extends `${EnclosingQuote}${string}` ? parseQuotedToken<token>
	: [token] extends [keyof args] ? null
	: token extends keyof $ ? referenceToAst<token, $[token]>
	: resolveAmbient<token, $> extends [unknown] ?
		referenceToAst<token, resolveAmbient<token, $>[0]>
	: `#${token}` extends keyof $ ? null
	: token extends `${string}${WhitespaceChar}${string}` ? null
	: token extends NumberLiteral<infer n> ? InferredAst<n, token>
	: token extends BigintLiteral<infer b> ? InferredAst<b, token>
	: null

type parseQuotedToken<token extends string> =
	token extends `'${infer content}'` ?
		content extends `${string}${"'" | Backslash}${string}` ?
			null
		:	InferredAst<content, token>
	: token extends `"${infer content}"` ?
		content extends `${string}${'"' | Backslash}${string}` ?
			null
		:	InferredAst<content, token>
	:	null

// only number literal limits separated from their operand by single spaces
type parseBoundedOperand<def extends string, $, args> =
	def extends `${infer l} ${infer comparator extends Comparator} ${infer r}` ?
		parseOperandToken<l, $, args> extends (
			InferredAst<Date | number, `${infer min extends number | DateLiteral}`>
		) ?
			[comparator, r] extends (
				[
					"<" | "<=",
					`${infer operand} ${infer maxComparator extends MaxComparator} ${infer max}`
				]
			) ?
				parseRightBound<operand, max, $, args> extends (
					[infer ast, infer maxLimit]
				) ?
					[min, InvertedComparators[comparator], [ast, maxComparator, maxLimit]]
				:	fullStringParse<s.initialize<def>, $, args>
			:	fullStringParse<s.initialize<def>, $, args>
		: parseRightBound<l, r, $, args> extends [infer ast, infer limit] ?
			[ast, comparator, limit]
		:	fullStringParse<s.initialize<def>, $, args>
	:	fullStringParse<s.initialize<def>, $, args>

type parseRightBound<operand extends string, limit extends string, $, args> =
	parseOperandToken<operand, $, args> extends infer ast ?
		null extends ast ? null
		: // parseOperandToken never resolves a date literal
		[ast] extends [InferredAst<Date | number, `${number}`>] ? null
		: parseOperandToken<limit, $, args> extends (
			InferredAst<unknown, `${infer value extends number | DateLiteral}`>
		) ?
			[ast, value]
		:	null
	:	never

type referenceToAst<reference extends string, resolution> =
	resolutionToAst<reference, resolution> extends infer ast ?
		ast extends GenericAst ?
			null
		:	ast
	:	never

type trimSpaces<token extends string> =
	token extends ` ${infer rest}` ? trimSpaces<rest>
	: token extends `${infer rest} ` ? trimSpaces<rest>
	: token

export type inferString<def extends string, $, args> = inferAstRoot<
	parseString<def, $, args>,
	$,
	args
>

export type BaseCompletions<$, args, otherSuggestions extends string = never> =
	| resolvableReferenceIn<$>
	| resolvableReferenceIn<ArkAmbient.$>
	| (keyof args & string)
	| StringifiablePrefixOperator
	| otherSuggestions

export const fullStringParse = (s: RuntimeState): InnerParseResult => {
	s.parseOperand()
	let result: InnerParseResult = parseUntilFinalizer(s).root
	if (!result) {
		return throwInternalError(
			`Root was unexpectedly unset after parsing string '${s.sc.scanned}'`
		)
	}

	if (s.finalizer === "=") result = parseDefault(s as RootedRuntimeState)
	else if (s.finalizer === "?") result = [result, "?"]

	s.sc.skipSpace()
	if (s.sc.peek) {
		// throw a parse error if non-whitespace characters made it here without being parsed
		throwParseError(writeUnexpectedCharacterMessage(s.sc.peek))
	}
	return result
}

type fullStringParse<s extends StaticState, $, args> = extractFinalizedResult<
	parseUntilFinalizer<s, $, args>
>

export const parseUntilFinalizer = (s: RuntimeState): RootedRuntimeState => {
	while (s.finalizer === undefined) next(s)

	return s as RootedRuntimeState
}

export type parseUntilFinalizer<s extends StaticState, $, args> =
	s["finalizer"] extends undefined ?
		parseUntilFinalizer<next<s, $, args>, $, args>
	:	s

const next = (s: RuntimeState): void =>
	s.hasRoot() ? s.parseOperator() : s.parseOperand()

type next<s extends StaticState, $, args> =
	s["root"] extends undefined ? parseOperand<s, $, args>
	:	parseOperator<s, $, args>

export type extractFinalizedResult<s extends StaticState> =
	s["finalizer"] extends "" ? s["root"]
	: s["finalizer"] extends ErrorMessage ? s["finalizer"]
	: s["finalizer"] extends "?" ? [s["root"], "?"]
	: s["finalizer"] extends "=" ? parseDefault<s["root"], s["unscanned"]>
	: ErrorMessage<writeUnexpectedCharacterMessage<s["finalizer"] & string>>
