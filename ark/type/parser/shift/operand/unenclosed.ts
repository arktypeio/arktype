import {
	hasArkKind,
	writeUnresolvableMessage,
	type BaseRoot,
	type GenericAst,
	type GenericRoot,
	type arkKind,
	type genericParamNames,
	type resolvableReferenceIn,
	type writeNonSubmoduleDotMessage
} from "@ark/schema"
import {
	printable,
	throwParseError,
	tryParseWellFormedBigint,
	tryParseWellFormedNumber,
	type BigintLiteral,
	type NumberLiteral,
	type Scanner,
	type join,
	type lastOf
} from "@ark/util"
import type { ArkAmbient } from "../../../config.ts"
import type { resolutionToAst } from "../../../scope.ts"
import type { GenericInstantiationAst } from "../../ast/generic.ts"
import type { InferredAst } from "../../ast/infer.ts"
import { writePrefixedPrivateReferenceMessage } from "../../ast/validate.ts"
import type { RuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import type { BaseCompletions } from "../../string.ts"
import { terminatingChars, type TerminatingChar } from "../tokens.ts"
import {
	parseGenericArgs,
	writeInvalidGenericArgCountMessage,
	type ParsedArgs
} from "./genericArgs.ts"

export const parseUnenclosed = (s: RuntimeState): void => {
	const token = s.scanner.shiftUntilLookahead(terminatingChars)
	if (token === "keyof") s.addPrefix("keyof")
	else s.root = unenclosedToNode(s, token)
}

export type parseUnenclosed<s extends StaticState, $, args> =
	Scanner.shiftUntil<s["unscanned"], TerminatingChar> extends (
		Scanner.shiftResult<infer token, infer unscanned>
	) ?
		tryResolve<s, unscanned, token, $, args> extends s.from<infer s> ?
			s
		:	never
	:	never

type parseResolution<
	s extends StaticState,
	unscanned extends string,
	alias extends string,
	resolution,
	$,
	args
> =
	resolutionToAst<alias, resolution> extends infer ast ?
		ast extends GenericAst ?
			parseGenericInstantiation<alias, ast, s.scanTo<s, unscanned>, $, args>
		:	s.setRoot<s, ast, unscanned>
	:	never

export const parseGenericInstantiation = (
	name: string,
	g: GenericRoot,
	s: RuntimeState
): BaseRoot => {
	s.scanner.shiftUntilNonWhitespace()
	const lookahead = s.scanner.shift()
	if (lookahead !== "<")
		return s.error(writeInvalidGenericArgCountMessage(name, g.names, []))

	const parsedArgs = parseGenericArgs(name, g, s)
	return g(...parsedArgs) as never
}

export type parseGenericInstantiation<
	name extends string,
	g extends GenericAst,
	s extends StaticState,
	$,
	args
> =
	// skip whitepsace to allow instantiations like `Partial    <T>`
	Scanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}` ?
		parseGenericArgs<name, g, unscanned, $, args> extends infer result ?
			result extends ParsedArgs<infer argAsts, infer nextUnscanned> ?
				s.setRoot<s, GenericInstantiationAst<g, argAsts>, nextUnscanned>
			:	// propagate error
				result
		:	never
	:	s.error<
			writeInvalidGenericArgCountMessage<
				name,
				genericParamNames<g["paramsAst"]>,
				[]
			>
		>

const unenclosedToNode = (s: RuntimeState, token: string): BaseRoot =>
	maybeParseReference(s, token) ??
	maybeParseUnenclosedLiteral(s, token) ??
	s.error(
		token === "" ?
			s.scanner.lookahead === "#" ?
				writePrefixedPrivateReferenceMessage(
					s.shiftedByOne().scanner.shiftUntilLookahead(terminatingChars)
				)
			:	writeMissingOperandMessage(s)
		:	writeUnresolvableMessage(token)
	)

const maybeParseReference = (
	s: RuntimeState,
	token: string
): BaseRoot | undefined => {
	if (s.ctx.args?.[token]) {
		const arg = s.ctx.args[token]
		if (typeof arg !== "string") return arg

		return s.ctx.$.node("alias", { reference: arg }, { prereduced: true })
	}
	const resolution = s.ctx.$.maybeResolve(token)
	if (hasArkKind(resolution, "root")) return resolution
	if (resolution === undefined) return
	if (hasArkKind(resolution, "generic"))
		return parseGenericInstantiation(token, resolution, s)

	return throwParseError(`Unexpected resolution ${printable(resolution)}`)
}

const maybeParseUnenclosedLiteral = (
	s: RuntimeState,
	token: string
): BaseRoot | undefined => {
	const maybeNumber = tryParseWellFormedNumber(token)
	if (maybeNumber !== undefined)
		return s.ctx.$.node("unit", { unit: maybeNumber })

	const maybeBigint = tryParseWellFormedBigint(token)
	if (maybeBigint !== undefined)
		return s.ctx.$.node("unit", { unit: maybeBigint })
}

type tryResolve<
	s extends StaticState,
	unscanned extends string,
	token extends string,
	$,
	args
> =
	token extends keyof args ?
		parseResolution<s, unscanned, token, args[token], $, args>
	: token extends keyof $ ?
		parseResolution<s, unscanned, token, $[token], $, args>
	: // this assumes there are no private aliases in the ambient scope
	token extends keyof ArkAmbient.$ ?
		parseResolution<s, unscanned, token, ArkAmbient.$[token], $, args>
	: `#${token}` extends keyof $ ?
		parseResolution<s, unscanned, token, $[`#${token}`], $, args>
	: token extends NumberLiteral<infer n> ?
		s.setRoot<s, InferredAst<n, token>, unscanned>
	: token extends (
		`${infer submodule extends keyof $ & string}.${infer reference}`
	) ?
		tryResolveSubmodule<
			token,
			$[submodule],
			reference,
			s,
			unscanned,
			$,
			args,
			[submodule]
		>
	: token extends (
		`${infer submodule extends keyof ArkAmbient.$ & string}.${infer reference}`
	) ?
		tryResolveSubmodule<
			token,
			ArkAmbient.$[submodule],
			reference,
			s,
			unscanned,
			$,
			args,
			[submodule]
		>
	: token extends BigintLiteral<infer b> ?
		s.setRoot<s, InferredAst<b, token>, unscanned>
	: token extends "keyof" ? s.addPrefix<s, "keyof", unscanned>
	: unresolvableState<s, token, $, args, []>

type tryResolveSubmodule<
	token extends string,
	resolution,
	reference extends string,
	s extends StaticState,
	unscanned extends string,
	$,
	args,
	submodulePath extends string[]
> =
	resolution extends { [arkKind]: "module" } ?
		reference extends keyof resolution ?
			parseResolution<s, unscanned, token, resolution[reference], $, args>
		: reference extends (
			`${infer nestedSubmodule extends keyof resolution & string}.${infer nestedReference}`
		) ?
			tryResolveSubmodule<
				token,
				resolution[nestedSubmodule],
				nestedReference,
				s,
				unscanned,
				$,
				args,
				[...submodulePath, nestedSubmodule]
			>
		:	unresolvableState<s, reference, resolution, {}, submodulePath>
	:	s.error<writeNonSubmoduleDotMessage<lastOf<submodulePath>>>

/** Provide valid completions for the current token, or fallback to an
 * unresolvable error if there are none */
export type unresolvableState<
	s extends StaticState,
	token extends string,
	resolutions,
	args,
	submodulePath extends string[]
> =
	[token, s["unscanned"]] extends ["", Scanner.shift<"#", infer unscanned>] ?
		Scanner.shiftUntil<unscanned, TerminatingChar> extends (
			Scanner.shiftResult<infer name, string>
		) ?
			s.error<writePrefixedPrivateReferenceMessage<name>>
		:	never
	: validReferenceFromToken<token, resolutions, args, submodulePath> extends (
		never
	) ?
		s.error<writeUnresolvableMessage<qualifiedReference<token, submodulePath>>>
	:	s.completion<`${s["scanned"]}${qualifiedReference<
			validReferenceFromToken<token, resolutions, args, submodulePath>,
			submodulePath
		>}`>

type qualifiedReference<
	reference extends string,
	submodulePath extends string[]
> = join<[...submodulePath, reference], ".">

type validReferenceFromToken<
	token extends string,
	$,
	args,
	submodulePath extends string[]
> = Extract<
	submodulePath["length"] extends 0 ? BaseCompletions<$, args>
	:	resolvableReferenceIn<$>,
	`${token}${string}`
>

export const writeMissingOperandMessage = (s: RuntimeState): string => {
	const operator = s.previousOperator()
	return operator ?
			writeMissingRightOperandMessage(operator, s.scanner.unscanned)
		:	writeExpressionExpectedMessage(s.scanner.unscanned)
}

export type writeMissingRightOperandMessage<
	token extends string,
	unscanned extends string = ""
> = `Token '${token}' requires a right operand${unscanned extends "" ? ""
:	` before '${unscanned}'`}`

export const writeMissingRightOperandMessage = <
	token extends string,
	unscanned extends string
>(
	token: token,
	unscanned = "" as unscanned
): writeMissingRightOperandMessage<token, unscanned> =>
	`Token '${token}' requires a right operand${
		unscanned ? (` before '${unscanned}'` as any) : ""
	}`

export const writeExpressionExpectedMessage = <unscanned extends string>(
	unscanned: unscanned
): writeExpressionExpectedMessage<unscanned> =>
	`Expected an expression${unscanned ? ` before '${unscanned}'` : ""}` as never

export type writeExpressionExpectedMessage<unscanned extends string> =
	`Expected an expression${unscanned extends "" ? ""
	:	` before '${unscanned}'`}`
