import {
	GenericRoot,
	type arkKind,
	type BaseParseContext,
	type GenericAst,
	type GenericParamAst,
	type GenericParamDef,
	type genericParamNames,
	type LazyGenericBody
} from "@ark/schema"
import {
	throwParseError,
	type array,
	type Callable,
	type conform,
	type ErrorMessage,
	type ErrorType,
	type Hkt,
	type Json,
	type WhiteSpaceToken
} from "@ark/util"
import type { type } from "./keywords/ark.ts"
import type {
	inferDefinition,
	validateDefinition
} from "./parser/definition.ts"
import type { inferAstRoot } from "./parser/semantic/infer.ts"
import type { validateAst } from "./parser/semantic/validate.ts"
import { DynamicState } from "./parser/string/reduce/dynamic.ts"
import type { state, StaticState } from "./parser/string/reduce/static.ts"
import type { Scanner } from "./parser/string/shift/scanner.ts"
import { parseUntilFinalizer } from "./parser/string/string.ts"
import type { Scope } from "./scope.ts"
import type { Type } from "./type.ts"

export type ParameterString<params extends string = string> = `<${params}>`

export type extractParams<s extends ParameterString> =
	s extends ParameterString<infer params> ? params : never

export type validateParameterString<s extends ParameterString, $> =
	parseGenericParams<extractParams<s>, $> extends infer e extends ErrorMessage ?
		e
	:	s

export type validateGenericArg<arg, param extends GenericParamAst, $> =
	type.infer<arg, $> extends param[1] ? unknown
	:	ErrorType<`Invalid argument for ${param[0]}`, [expected: param[1]]>

export type GenericInstantiator<
	params extends array<GenericParamAst>,
	def,
	$,
	args$
> =
	params["length"] extends 1 ?
		{
			<const a, r = instantiateGeneric<def, params, [a], $, args$>>(
				a: type.validate<a, args$> & validateGenericArg<a, params[0], args$>
			): r
		}
	: params["length"] extends 2 ?
		{
			<const a, const b, r = instantiateGeneric<def, params, [a, b], $, args$>>(
				...args: [type.validate<a, args$>, type.validate<b, args$>] &
					[
						validateGenericArg<a, params[0], args$>,
						validateGenericArg<b, params[1], args$>
					]
			): r
		}
	: params["length"] extends 3 ?
		{
			<
				const a,
				const b,
				const c,
				r = instantiateGeneric<def, params, [a, b, c], $, args$>
			>(
				...args: [
					type.validate<a, args$>,
					type.validate<b, args$>,
					type.validate<c, args$>
				] &
					[
						validateGenericArg<a, params[0], args$>,
						validateGenericArg<b, params[1], args$>,
						validateGenericArg<c, params[2], args$>
					]
			): r
		}
	: params["length"] extends 4 ?
		{
			<
				const a,
				const b,
				const c,
				const d,
				r = instantiateGeneric<def, params, [a, b, c, d], $, args$>
			>(
				...args: [
					type.validate<a, args$>,
					type.validate<b, args$>,
					type.validate<c, args$>,
					type.validate<d, args$>
				] &
					[
						validateGenericArg<a, params[0], args$>,
						validateGenericArg<b, params[1], args$>,
						validateGenericArg<c, params[2], args$>,
						validateGenericArg<d, params[3], args$>
					]
			): r
		}
	: params["length"] extends 4 ?
		{
			<
				const a,
				const b,
				const c,
				const d,
				const e,
				r = instantiateGeneric<def, params, [a, b, c, d, e], $, args$>
			>(
				...args: [
					type.validate<a, args$>,
					type.validate<b, args$>,
					type.validate<c, args$>,
					type.validate<d, args$>,
					type.validate<e, args$>
				] &
					[
						validateGenericArg<a, params[0], args$>,
						validateGenericArg<b, params[1], args$>,
						validateGenericArg<c, params[2], args$>,
						validateGenericArg<d, params[3], args$>,
						validateGenericArg<e, params[4], args$>
					]
			): r
		}
	: params["length"] extends 5 ?
		{
			<
				const a,
				const b,
				const c,
				const d,
				const e,
				const f,
				r = instantiateGeneric<def, params, [a, b, c, d, e, f], $, args$>
			>(
				...args: [
					type.validate<a, args$>,
					type.validate<b, args$>,
					type.validate<c, args$>,
					type.validate<d, args$>,
					type.validate<e, args$>,
					type.validate<f, args$>
				] &
					[
						validateGenericArg<a, params[0], args$>,
						validateGenericArg<b, params[1], args$>,
						validateGenericArg<c, params[2], args$>,
						validateGenericArg<d, params[3], args$>,
						validateGenericArg<e, params[4], args$>,
						validateGenericArg<f, params[5], args$>
					]
			): r
		}
	: params["length"] extends 6 ?
		{
			<
				const a,
				const b,
				const c,
				const d,
				const e,
				const f,
				const g,
				r = instantiateGeneric<def, params, [a, b, c, d, e, f, g], $, args$>
			>(
				...args: [
					type.validate<a, args$>,
					type.validate<b, args$>,
					type.validate<c, args$>,
					type.validate<d, args$>,
					type.validate<e, args$>,
					type.validate<f, args$>,
					type.validate<g, args$>
				] &
					[
						validateGenericArg<a, params[0], args$>,
						validateGenericArg<b, params[1], args$>,
						validateGenericArg<c, params[2], args$>,
						validateGenericArg<d, params[3], args$>,
						validateGenericArg<e, params[4], args$>,
						validateGenericArg<f, params[5], args$>,
						validateGenericArg<g, params[6], args$>
					]
			): r
		}
	:	(
			error: ErrorMessage<`You may not define more than 7 positional generic parameters`>
		) => never

type instantiateGeneric<
	def,
	params extends array<GenericParamAst>,
	args,
	$,
	args$
> = Type<
	[def] extends [Hkt] ?
		Hkt.apply<def, { [i in keyof args]: type.infer<args[i], args$> }>
	:	inferDefinition<def, $, bindGenericArgs<params, args$, args>>,
	args$
>

type bindGenericArgs<params extends array<GenericParamAst>, $, args> = {
	[i in keyof params & `${number}` as params[i][0]]: type.infer<
		args[i & keyof args],
		$
	>
}

type baseGenericResolutions<params extends array<GenericParamAst>, $> =
	baseGenericConstraints<params> extends infer baseConstraints ?
		{ [k in keyof baseConstraints]: Type<baseConstraints[k], $> }
	:	never

export type baseGenericConstraints<params extends array<GenericParamAst>> = {
	[i in keyof params & `${number}` as params[i][0]]: params[i][1]
}

export interface Generic<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = {},
	arg$ = $
> extends Callable<GenericInstantiator<params, bodyDef, $, arg$>> {
	[arkKind]: "generic"
	t: GenericAst<params, bodyDef, $, arg$>

	bodyDef: bodyDef
	params: { [i in keyof params]: [params[i][0], Type<params[i][1], $>] }
	names: genericParamNames<params>
	constraints: { [i in keyof params]: Type<params[i][1], $> }

	$: Scope<$>
	arg$: Scope<arg$>

	internal: GenericRoot
	json: Json
}

export type GenericConstructor<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = {},
	arg$ = {}
> = new () => Generic<params, bodyDef, $, arg$>

export const Generic: GenericConstructor = GenericRoot as never

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

export type parseGenericParams<def extends string, $> = parseNextNameChar<
	Scanner.skipWhitespace<def>,
	"",
	[],
	$
>

type ParamsTerminator = WhiteSpaceToken | ","

export const parseGenericParamName = (
	scanner: Scanner,
	result: GenericParamDef[],
	ctx: BaseParseContext
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
			name extends "" ? ErrorMessage<emptyGenericParameterMessage>
			: lookahead extends "," ?
				parseName<nextUnscanned, [...result, [name, unknown]], $>
			: lookahead extends WhiteSpaceToken ?
				_parseOptionalConstraint<nextUnscanned, name, result, $>
			:	never
		:	parseNextNameChar<nextUnscanned, `${name}${lookahead}`, result, $>
	: name extends "" ? result
	: [...result, [name, unknown]]

const extendsToken = "extends "

type extendsToken = typeof extendsToken

const _parseOptionalConstraint = (
	scanner: Scanner,
	name: string,
	result: GenericParamDef[],
	ctx: BaseParseContext
): GenericParamDef[] => {
	scanner.shiftUntilNonWhitespace()
	if (scanner.unscanned.startsWith(extendsToken))
		scanner.jumpForward(extendsToken.length)
	else {
		// if we don't have a contraining token here, return now so we can
		// assume in the rest of the function body we do have a constraint
		if (scanner.lookahead === ",") scanner.shift()
		result.push(name)
		return parseGenericParamName(scanner, result, ctx)
	}

	const s = parseUntilFinalizer(new DynamicState(scanner, ctx))
	result.push([name, s.root])

	return parseGenericParamName(scanner, result, ctx)
}

type _parseOptionalConstraint<
	unscanned extends string,
	name extends string,
	result extends array<GenericParamAst>,
	$
> =
	Scanner.skipWhitespace<unscanned> extends (
		`${extendsToken}${infer nextUnscanned}`
	) ?
		parseUntilFinalizer<state.initialize<nextUnscanned>, $, {}> extends (
			infer finalArgState extends StaticState
		) ?
			validateAst<finalArgState["root"], $, {}> extends (
				infer e extends ErrorMessage
			) ?
				e
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

type genericParamDefToAst<schema extends GenericParamDef, $> =
	schema extends string ? [schema, unknown]
	: schema extends readonly [infer name, infer def] ? [name, type.infer<def, $>]
	: never

export type genericParamDefsToAst<defs extends array<GenericParamDef>, $> = [
	...{ [i in keyof defs]: genericParamDefToAst<defs[i], $> }
]

export type GenericParser<$ = {}> = <
	const paramsDef extends array<GenericParamDef>
>(
	...params: {
		[i in keyof paramsDef]: paramsDef[i] extends (
			readonly [infer name, infer def]
		) ?
			readonly [name, type.validate<def, $>]
		:	paramsDef[i]
	}
) => GenericBodyParser<genericParamDefsToAst<paramsDef, $>, $>

interface GenericBodyParser<params extends array<GenericParamAst>, $> {
	<const body>(
		body: validateDefinition<body, $, baseGenericConstraints<params>>
	): Generic<params, body, $, $>

	<hkt extends Hkt.constructor>(
		instantiateDef: LazyGenericBody<baseGenericResolutions<params, $>>,
		hkt: hkt
	): Generic<params, InstanceType<hkt>, $, $>
}
