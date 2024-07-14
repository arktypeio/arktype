import type {
	GenericNodeSignature,
	GenericParamAst,
	GenericParamDef,
	GenericRoot
} from "@arktype/schema"
import {
	throwParseError,
	type array,
	type Callable,
	type conform,
	type ErrorMessage,
	type firstChar,
	type keyError,
	type WhiteSpaceToken
} from "@arktype/util"
import type { inferDefinition } from "./parser/definition.js"
import type { inferAstIn } from "./parser/semantic/infer.js"
import type { state, StaticState } from "./parser/string/reduce/static.js"
import { writeUnexpectedCharacterMessage } from "./parser/string/shift/operator/operator.js"
import { Scanner } from "./parser/string/shift/scanner.js"
import type { parseUntilFinalizer } from "./parser/string/string.js"
import type { inferTypeRoot, Type, validateTypeRoot } from "./type.js"

export type ParameterString<params extends string = string> = `<${params}>`

type extractParams<s extends ParameterString> =
	s extends ParameterString<infer params> ? params : never

export type validateParameterString<s extends ParameterString, $> =
	parseGenericParams<extractParams<s>, $> extends keyError<infer message> ?
		ErrorMessage<message>
	:	s

export type GenericTypeInstantiation<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	def = any,
	$ = any
> = <args>(
	...args: conform<
		args,
		{
			[i in keyof params]: validateTypeRoot<args[i & keyof args], $>
		}
	>
) => Type<inferDefinition<def, $, bindGenericInstantiation<params, $, args>>, $>

export type GenericInstantiation<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	def = any,
	$ = any
> = GenericTypeInstantiation<params, def, $> &
	GenericNodeSignature<params, def, $>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
type bindGenericInstantiation<
	params extends array<GenericParamAst>,
	$,
	args
> = {
	[i in keyof params & `${number}` as params[i][0]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}

export type baseGenericInstantiation<params extends array<GenericParamAst>> = {
	[i in keyof params & `${number}` as params[i][0]]: params[i][1]
}

export interface Generic<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = {}
> extends Callable<GenericInstantiation<params, bodyDef, $>>,
		GenericRoot<params, bodyDef, $> {}

export type GenericDeclaration<
	name extends string = string,
	params extends ParameterString = ParameterString
> = `${name}${params}`

export const parseGenericParams = (def: string): array<GenericParamDef> =>
	_parseGenericParams(new Scanner(def))

export type parseValidGenericParams<def extends ParameterString, $> = conform<
	parseGenericParams<extractParams<def>, $>,
	array<GenericParamAst>
>

type O = parseGenericParams<"t extends string,u:number", {}>
export type parseGenericParams<def extends string, $> = _parseParams<
	def,
	"",
	[],
	$
>

export const emptyGenericParameterMessage =
	"An empty string is not a valid generic parameter name"

export type emptyGenericParameterMessage = typeof emptyGenericParameterMessage

const _parseGenericParams = (scanner: Scanner): array<GenericParamDef> => {
	const param = scanner.shiftUntilNextTerminator()
	if (param === "") throwParseError(emptyGenericParameterMessage)

	scanner.shiftUntilNonWhitespace()
	const nextNonWhitespace = scanner.shift()
	return (
		nextNonWhitespace === "" ? [param]
		: nextNonWhitespace === "," ? [param, ..._parseGenericParams(scanner)]
		: throwParseError(writeUnexpectedCharacterMessage(nextNonWhitespace, ","))
	)
}

type _parseParams<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	unscanned extends `${infer lookahead}${infer nextUnscanned}` ?
		lookahead extends "," ?
			name extends "" ?
				keyError<emptyGenericParameterMessage>
			:	_parseParams<nextUnscanned, "", [...result, [name, unknown]], $>
		: lookahead extends WhiteSpaceToken ?
			name extends "" ?
				// if the next char is whitespace and we aren't in the middle of a param, skip to the next one
				_parseParams<Scanner.skipWhitespace<nextUnscanned>, "", result, $>
			: Scanner.skipWhitespace<nextUnscanned> extends (
				`${infer nextNonWhitespace}${infer rest}`
			) ?
				nextNonWhitespace extends "," ?
					_parseParams<rest, "", [...result, [name, unknown]], $>
				: nextNonWhitespace extends "e" | ":" ?
					// use nextUncanner instead of rest here to preserve the leading : or e
					_parseConstraintAndContinue<nextUnscanned, name, result, $>
				:	keyError<writeUnexpectedCharacterMessage<nextNonWhitespace, ",">>
			: name extends "" ? keyError<emptyGenericParameterMessage>
			: // params end with a single whitespace character, add the current token
				[...result, [name, unknown]]
		:	_parseParams<nextUnscanned, `${name}${lookahead}`, result, $>
	: name extends "" ? result
	: [...result, [name, unknown]]

type _parseConstraintAndContinue<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	unscanned extends `${"extends" | ":"}${infer nextUnscanned}` ?
		parseUntilFinalizer<state.initialize<nextUnscanned>, $, {}> extends (
			infer finalArgState extends StaticState
		) ?
			finalArgState["finalizer"] extends ErrorMessage<infer message> ?
				keyError<message>
			:	_parseParams<
					finalArgState["unscanned"],
					"",
					[...result, [name, inferAstIn<finalArgState["root"], $, {}>]],
					$
				>
		:	never
	:	keyError<
			writeUnexpectedCharacterMessage<firstChar<unscanned>, "extends" | ":">
		>
