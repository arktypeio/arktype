import type {
	GenericNodeSignature,
	GenericParamAst,
	GenericParamDef,
	GenericRoot
} from "@arktype/schema"
import {
	throwParseError,
	whiteSpaceTokens,
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
import { DynamicState } from "./parser/string/reduce/dynamic.js"
import type { state, StaticState } from "./parser/string/reduce/static.js"
import { Scanner } from "./parser/string/shift/scanner.js"
import { parseUntilFinalizer } from "./parser/string/string.js"
import type { ParseContext } from "./scope.js"
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

export type parseValidGenericParams<def extends ParameterString, $> = conform<
	parseGenericParams<extractParams<def>, $>,
	array<GenericParamAst>
>

export const emptyGenericParameterMessage =
	"An empty string is not a valid generic parameter name"

export type emptyGenericParameterMessage = typeof emptyGenericParameterMessage

export const parseGenericParams = (
	def: string,
	ctx: ParseContext
): array<GenericParamDef> => parseName(new Scanner(def), [], ctx)

export type parseGenericParams<def extends string, $> = parseNextNameChar<
	Scanner.skipWhitespace<def>,
	"",
	[],
	$
>

const paramsTerminators = { ...whiteSpaceTokens, ",": true, ":": true }

type ParamsTerminator = keyof typeof paramsTerminators

const parseName = (
	scanner: Scanner,
	result: GenericParamDef[],
	ctx: ParseContext
): GenericParamDef[] => {
	scanner.shiftUntilNonWhitespace()
	const name = scanner.shiftUntilNextTerminator()
	if (name === "") {
		// if we've reached the end of the string and have parsed at least one
		// param, return the valid result
		if (scanner.lookahead === "" && result.length) return result
		return throwParseError(emptyGenericParameterMessage)
	}

	scanner.shiftUntilNonWhitespace()

	if (scanner.lookahead === ",")
		return parseName(scanner, [...result, [name, $ark.intrinsic.unknown]], ctx)

	return _parseOptionalConstraint(scanner, name, result, ctx)
}

type parseName<
	unscanned extends string,
	result extends array<GenericParamAst>,
	$
> = parseNextNameChar<Scanner.skipWhitespace<unscanned>, "", result, $>

type parseNextNameChar<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	unscanned extends `${infer lookahead}${infer nextUnscanned}` ?
		lookahead extends ParamsTerminator ?
			name extends "" ? keyError<emptyGenericParameterMessage>
			: lookahead extends "," ?
				parseName<nextUnscanned, [...result, [name, unknown]], $>
			: lookahead extends ":" | WhiteSpaceToken ?
				// pass in unscanned instead of nextUnscanned here so we don't
				// miss the ":" terminator
				_parseOptionalConstraint<unscanned, name, result, $>
			:	never
		:	parseNextNameChar<nextUnscanned, `${name}${lookahead}`, result, $>
	: name extends "" ? result
	: [...result, [name, unknown]]

const extendsToken = "extends "

type ConstrainingToken = ":" | typeof extendsToken

const _parseOptionalConstraint = (
	scanner: Scanner,
	name: string,
	result: GenericParamDef[],
	ctx: ParseContext
): GenericParamDef[] => {
	scanner.shiftUntilNonWhitespace()

	if (scanner.lookahead === ":") scanner.shift()
	else if (scanner.unscanned.startsWith(extendsToken))
		scanner.jumpForward(extendsToken.length)
	else {
		// if we don't have a contraining token here, return now so we can
		// assume in the rest of the function body we do have a constraint
		if (scanner.lookahead === ",") scanner.shift()
		result.push(name)
		return parseName(scanner, result, ctx)
	}

	const s = parseUntilFinalizer(new DynamicState(scanner, ctx, false))
	result.push([name, s.root])

	return parseName(scanner, result, ctx)
}

type _parseOptionalConstraint<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	Scanner.skipWhitespace<unscanned> extends (
		`${ConstrainingToken}${infer nextUnscanned}`
	) ?
		parseUntilFinalizer<state.initialize<nextUnscanned>, $, {}> extends (
			infer finalArgState extends StaticState
		) ?
			validateAst<finalArgState["root"], $, {}> extends (
				ErrorMessage<infer message>
			) ?
				keyError<message>
			:	parseName<
					finalArgState["unscanned"],
					[...result, [name, inferAstRoot<finalArgState["root"], $, {}>]],
					$
				>
		:	never
	:	parseName<
			Scanner.skipWhitespace<unscanned> extends `,${infer nextUnscanned}` ?
				nextUnscanned
			:	unscanned,
			[...result, [name, unknown]],
			$
		>
