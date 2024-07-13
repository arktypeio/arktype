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
	type keyError,
	type WhiteSpaceToken
} from "@arktype/util"
import type { inferDefinition } from "./parser/definition.js"
import { writeUnexpectedCharacterMessage } from "./parser/string/shift/operator/operator.js"
import { Scanner } from "./parser/string/shift/scanner.js"
import type { inferTypeRoot, Type, validateTypeRoot } from "./type.js"

export type validateParameterString<params extends string> =
	parseGenericParams<params> extends keyError<infer message> ? message : params

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

// TODO: should be Scope<$>, but breaks inference
export interface Generic<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = any
> extends Callable<GenericInstantiation<params, bodyDef, $>>,
		GenericRoot<params, bodyDef, $> {}

export type GenericDeclaration<
	name extends string = string,
	params extends string = string
> = `${name}<${params}>`

export const parseGenericParams = (def: string): array<GenericParamDef> =>
	_parseGenericParams(new Scanner(def))

export type parseValidGenericParams<def extends string> = conform<
	parseGenericParams<def>,
	array<GenericParamAst>
>

export type parseGenericParams<def extends string> =
	_parseParams<def, "", []> extends (
		infer result extends array<GenericParamAst>
	) ?
		"" extends result[number][0] ?
			keyError<emptyGenericParameterMessage>
		:	result
	:	never

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
	param extends string,
	result extends array<GenericParamAst>
> =
	unscanned extends `${infer lookahead}${infer nextUnscanned}` ?
		lookahead extends "," ?
			_parseParams<nextUnscanned, "", [...result, [param, unknown]]>
		: lookahead extends WhiteSpaceToken ?
			param extends "" ?
				// if the next char is whitespace and we aren't in the middle of a param, skip to the next one
				_parseParams<Scanner.skipWhitespace<nextUnscanned>, "", result>
			: Scanner.skipWhitespace<nextUnscanned> extends (
				`${infer nextNonWhitespace}${infer rest}`
			) ?
				nextNonWhitespace extends "," ?
					_parseParams<rest, "", [...result, [param, unknown]]>
				:	keyError<writeUnexpectedCharacterMessage<nextNonWhitespace, ",">>
			:	// params end with a single whitespace character, add the current token
				[...result, [param, unknown]]
		:	_parseParams<nextUnscanned, `${param}${lookahead}`, result>
	: param extends "" ? result
	: [...result, [param, unknown]]
