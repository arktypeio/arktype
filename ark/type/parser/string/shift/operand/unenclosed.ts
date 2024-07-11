import {
	BaseRoot,
	hasArkKind,
	writeUnresolvableMessage,
	type GenericProps,
	type GenericRoot,
	type PrivateDeclaration,
	type arkKind,
	type writeNonSubmoduleDotMessage
} from "@arktype/schema"
import {
	printable,
	throwParseError,
	tryParseWellFormedBigint,
	tryParseWellFormedNumber,
	type BigintLiteral,
	type Completion,
	type ErrorMessage,
	type anyOrNever,
	type join
} from "@arktype/util"
import type { GenericInstantiationAst } from "../../../semantic/infer.js"
import { writePrefixedPrivateReferenceMessage } from "../../../semantic/validate.js"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { StaticState, state } from "../../reduce/static.js"
import type { BaseCompletions } from "../../string.js"
import type { Scanner } from "../scanner.js"
import {
	parseGenericArgs,
	writeInvalidGenericArgsMessage,
	type ParsedArgs
} from "./genericArgs.js"

export const parseUnenclosed = (s: DynamicState): void => {
	const token = s.scanner.shiftUntilNextTerminator()
	if (token === "keyof") s.addPrefix("keyof")
	else s.root = unenclosedToNode(s, token)
}

export type parseUnenclosed<s extends StaticState, $, args> =
	Scanner.shiftUntilNextTerminator<s["unscanned"]> extends (
		Scanner.shiftResult<infer token, infer unscanned>
	) ?
		token extends "keyof" ? state.addPrefix<s, "keyof", unscanned>
		: tryResolve<s, token, $, args> extends infer result ?
			result extends ErrorMessage<infer message> ? state.error<message>
			: result extends keyof $ ?
				[$[result]] extends [anyOrNever] ? state.setRoot<s, result, unscanned>
				: $[result] extends GenericProps ?
					parseGenericInstantiation<
						token,
						$[result],
						state.scanTo<s, unscanned>,
						$,
						args
					>
				:	state.setRoot<s, result, unscanned>
			:	state.setRoot<s, result, unscanned>
		:	never
	:	never

export const parseGenericInstantiation = (
	name: string,
	g: GenericRoot,
	s: DynamicState
): BaseRoot => {
	s.scanner.shiftUntilNonWhitespace()
	const lookahead = s.scanner.shift()
	if (lookahead !== "<")
		return s.error(writeInvalidGenericArgsMessage(name, g.params, []))

	const parsedArgs = parseGenericArgs(name, g.params, s)
	const remainingChars = parsedArgs.unscanned.length
	// set the scanner position to where the args scanner left off
	s.scanner.jumpToIndex(
		remainingChars === 0 ? s.scanner.length : -remainingChars
	)
	return g(...(parsedArgs.result as never)) as never
}

export type parseGenericInstantiation<
	name extends string,
	g extends GenericProps,
	s extends StaticState,
	$,
	args
	// have to skip whitespace here since TS allows instantiations like `Partial    <T>`
> =
	Scanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}` ?
		parseGenericArgs<name, g["params"], unscanned, $, args> extends (
			infer result
		) ?
			result extends ParsedArgs<infer argAsts, infer nextUnscanned> ?
				state.setRoot<s, GenericInstantiationAst<g, argAsts>, nextUnscanned>
			:	// propagate error
				result
		:	never
	:	state.error<writeInvalidGenericArgsMessage<name, g["params"], []>>

const unenclosedToNode = (s: DynamicState, token: string): BaseRoot =>
	maybeParseReference(s, token) ??
	maybeParseUnenclosedLiteral(s, token) ??
	s.error(
		token === "" ? writeMissingOperandMessage(s)
		: token[0] === "#" ?
			writePrefixedPrivateReferenceMessage(token as PrivateDeclaration)
		:	writeUnresolvableMessage(token)
	)

const maybeParseReference = (
	s: DynamicState,
	token: string
): BaseRoot | undefined => {
	if (s.ctx.args?.[token]) return s.ctx.args[token].internal
	const resolution = s.ctx.$.maybeResolve(token)
	if (resolution instanceof BaseRoot) return resolution
	if (resolution === undefined) return
	if (hasArkKind(resolution, "generic"))
		return parseGenericInstantiation(token, resolution, s)

	return throwParseError(`Unexpected resolution ${printable(resolution)}`)
}

const maybeParseUnenclosedLiteral = (
	s: DynamicState,
	token: string
): BaseRoot | undefined => {
	const maybeNumber = tryParseWellFormedNumber(token)
	if (maybeNumber !== undefined)
		return s.ctx.$.node("unit", { unit: maybeNumber })

	const maybeBigint = tryParseWellFormedBigint(token)
	if (maybeBigint !== undefined)
		return s.ctx.$.node("unit", { unit: maybeBigint })
}

type tryResolve<s extends StaticState, token extends string, $, args> =
	token extends keyof ArkEnv.$ ? token
	: token extends keyof $ ? token
	: `#${token}` extends keyof $ ? token
	: token extends keyof args ? token
	: token extends `${number}` ? token
	: token extends BigintLiteral ? token
	: token extends (
		`${infer submodule extends (keyof $ | keyof ArkEnv.$) & string}.${infer reference}`
	) ?
		tryResolveSubmodule<token, submodule, reference, s, $ & ArkEnv.$, args>
	:	unresolvableError<s, token, $, args, []>

type tryResolveSubmodule<
	token,
	submodule extends keyof $ & string,
	reference extends string,
	s extends StaticState,
	$,
	args
> =
	$[submodule] extends { [arkKind]: "module" } ?
		reference extends keyof $[submodule] ?
			token
		:	unresolvableError<s, reference, $[submodule], args, [submodule]>
	:	ErrorMessage<writeNonSubmoduleDotMessage<submodule>>

/** Provide valid completions for the current token, or fallback to an
 * unresolvable error if there are none */
export type unresolvableError<
	s extends StaticState,
	token extends string,
	$,
	args,
	submodulePath extends string[]
> =
	validReferenceFromToken<token, $, args, submodulePath> extends never ?
		ErrorMessage<
			writeUnresolvableMessage<qualifiedReference<token, submodulePath>>
		>
	:	Completion<`${s["scanned"]}${qualifiedReference<
			validReferenceFromToken<token, $, args, submodulePath>,
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
	submodulePath extends [] ? BaseCompletions<$, args> : keyof $,
	`${token}${string}`
>

export const writeMissingOperandMessage = (s: DynamicState): string => {
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
