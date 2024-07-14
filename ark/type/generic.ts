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
	type keyError,
	type WhiteSpaceToken
} from "@arktype/util"
import type { inferDefinition } from "./parser/definition.js"
import type { inferAstRoot } from "./parser/semantic/infer.js"
import type { validateAst } from "./parser/semantic/validate.js"
import type { state, StaticState } from "./parser/string/reduce/static.js"
import { writeUnexpectedCharacterMessage } from "./parser/string/shift/operator/operator.js"
import { Scanner } from "./parser/string/shift/scanner.js"
import type { parseUntilFinalizer } from "./parser/string/string.js"
import type { inferTypeRoot, Type, validateTypeRoot } from "./type.js"

export type ParameterString<params extends string = string> = `<${params}>`

export type extractParams<s extends ParameterString> =
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
) => Type<inferDefinition<def, $, bindGenericArgs<params, $, args>>, $>

export type GenericInstantiation<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	def = any,
	$ = any
> = GenericTypeInstantiation<params, def, $> &
	GenericNodeSignature<params, def, $>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
type bindGenericArgs<params extends array<GenericParamAst>, $, args> = {
	[i in keyof params & `${number}` as params[i][0]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}

export type baseGenericArgs<params extends array<GenericParamAst>> = {
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

export type parseGenericParams<def extends string, $> = _parseName<
	Scanner.skipWhitespace<def>,
	"",
	[],
	$
>

type Terminator = "," | ":" | WhiteSpaceToken

type _parseName<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	unscanned extends `${infer lookahead}${infer nextUnscanned}` ?
		lookahead extends Terminator ?
			name extends "" ? keyError<emptyGenericParameterMessage>
			: lookahead extends "," ?
				_parseName<
					Scanner.skipWhitespace<nextUnscanned>,
					"",
					[...result, [name, unknown]],
					$
				>
			: lookahead extends WhiteSpaceToken ?
				_parseOptionalConstraint<
					Scanner.skipWhitespace<nextUnscanned>,
					name,
					result,
					$
				>
			: lookahead extends ":" ?
				// pass in unscanned instead of nextUnscanned here so we don't
				// miss the terminator
				_parseOptionalConstraint<unscanned, name, result, $>
			:	never
		:	_parseName<nextUnscanned, `${name}${lookahead}`, result, $>
	: name extends "" ? result
	: [...result, [name, unknown]]

type ConstrainingToken = ":" | "extends "

type _parseOptionalConstraint<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	unscanned extends `${ConstrainingToken}${infer nextUnscanned}` ?
		parseUntilFinalizer<state.initialize<nextUnscanned>, $, {}> extends (
			infer finalArgState extends StaticState
		) ?
			validateAst<finalArgState["root"], $, {}> extends (
				ErrorMessage<infer message>
			) ?
				keyError<message>
			:	_parseName<
					finalArgState["unscanned"],
					"",
					[...result, [name, inferAstRoot<finalArgState["root"], $, {}>]],
					$
				>
		:	never
	:	_parseName<
			Scanner.skipWhitespace<
				unscanned extends `,${infer nextUnscanned}` ? nextUnscanned : unscanned
			>,
			"",
			[...result, [name, unknown]],
			$
		>
