import { isNode, node, type Root } from "@arktype/schema"
import {
	stringify,
	throwParseError,
	tryParseNumber,
	tryParseWellFormedBigint,
	type BigintLiteral,
	type Completion,
	type ErrorMessage,
	type join,
	type NumberLiteral
} from "@arktype/util"
import type { Module } from "../../../../scope.ts"
import {
	hasArkKind,
	type Generic,
	type GenericProps
} from "../../../../type.ts"
import {
	parseGenericArgs,
	writeInvalidGenericArgsMessage,
	type ParsedArgs
} from "../../../generic.ts"
import type { GenericInstantiationAst } from "../../../semantic/semantic.ts"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import type { BaseCompletions } from "../../string.ts"
import type { Scanner } from "../scanner.ts"

export const parseUnenclosed = (s: DynamicState) => {
	const token = s.scanner.shiftUntilNextTerminator()
	if (token === "keyof") {
		s.addPrefix("keyof")
	} else {
		s.root = unenclosedToNode(s, token)
	}
}

export type parseUnenclosed<
	s extends StaticState,
	$,
	args
> = Scanner.shiftUntilNextTerminator<
	s["unscanned"]
> extends Scanner.shiftResult<infer token, infer unscanned>
	? token extends "keyof"
		? state.addPrefix<s, "keyof", unscanned>
		: tryResolve<s, token, $, args> extends infer result
		  ? result extends ErrorMessage<infer message>
				? state.error<message>
				: result extends keyof $
				  ? $[result] extends GenericProps
						? parseGenericInstantiation<
								token,
								$[result],
								state.scanTo<s, unscanned>,
								$,
								args
						  >
						: state.setRoot<s, result, unscanned>
				  : state.setRoot<s, result, unscanned>
		  : never
	: never

export const parseGenericInstantiation = (
	name: string,
	g: Generic,
	s: DynamicState
) => {
	s.scanner.shiftUntilNonWhitespace()
	const lookahead = s.scanner.shift()
	if (lookahead !== "<") {
		return s.error(writeInvalidGenericArgsMessage(name, g.parameters, []))
	}
	const parsedArgs = parseGenericArgs(
		name,
		g.parameters,
		s.scanner.unscanned,
		s.ctx
	)
	const remainingChars = parsedArgs.unscanned.length
	// set the scanner position to where the args scanner left off
	s.scanner.jumpToIndex(
		remainingChars === 0 ? s.scanner.length : -remainingChars
	)
	return g(...parsedArgs.result).root
}

export type parseGenericInstantiation<
	name extends string,
	g extends GenericProps,
	s extends StaticState,
	$,
	args
	// have to skip whitespace here since TS allows instantiations like `Partial    <T>`
> = Scanner.skipWhitespace<s["unscanned"]> extends `<${infer unscanned}`
	? parseGenericArgs<
			name,
			g["parameters"],
			unscanned,
			$,
			args
	  > extends infer result
		? result extends ParsedArgs<infer argAsts, infer nextUnscanned>
			? state.setRoot<s, GenericInstantiationAst<g, argAsts>, nextUnscanned>
			: // propagate error
			  result
		: never
	: state.error<writeInvalidGenericArgsMessage<name, g["parameters"], []>>

const unenclosedToNode = (s: DynamicState, token: string): Root =>
	maybeParseReference(s, token) ??
	maybeParseUnenclosedLiteral(s, token) ??
	s.error(
		token === ""
			? writeMissingOperandMessage(s)
			: writeUnresolvableMessage(token)
	)

const maybeParseReference = (
	s: DynamicState,
	token: string
): Root | undefined => {
	if (s.ctx.args?.[token]) {
		return s.ctx.args[token]
	}
	const resolution = s.ctx.scope.maybeResolve(token)
	if (isNode(resolution)) {
		return resolution
	}
	if (resolution === undefined) {
		return
	}
	if (hasArkKind(resolution, "generic")) {
		return parseGenericInstantiation(token, resolution, s)
	}
	return throwParseError(`Unexpected resolution ${stringify(resolution)}`)
}

const maybeParseUnenclosedLiteral = (
	s: DynamicState,
	token: string
): Root | undefined => {
	const maybeNumber = tryParseNumber(token, { strict: true })
	if (maybeNumber !== undefined) {
		return node({ is: maybeNumber })
	}
	const maybeBigint = tryParseWellFormedBigint(token)
	if (maybeBigint !== undefined) {
		return node({ is: maybeBigint })
	}
}

type tryResolve<
	s extends StaticState,
	token extends string,
	$,
	args
> = token extends keyof $
	? token
	: token extends keyof args
	  ? token
	  : token extends NumberLiteral
	    ? token
	    : token extends BigintLiteral
	      ? token
	      : token extends `${infer submodule extends keyof $ &
							string}.${infer reference}`
	        ? $[submodule] extends Module<infer r>
						? reference extends keyof r["exports"]
							? token
							: unknown extends r["exports"]
							  ? // not sure why I need the additional check here, but for now TS seems to
							    // hit this branch for a non-scope dot access rather than failing
							    // initially when we try to infer r. if this can be removed without breaking
							    // any submodule test cases, do it!
							    ErrorMessage<writeNonSubmoduleDotMessage<submodule>>
							  : unresolvableError<
										s,
										reference,
										$[submodule],
										args,
										[submodule]
							    >
						: ErrorMessage<writeNonSubmoduleDotMessage<submodule>>
	        : unresolvableError<s, token, $, args, []>

export const writeNonSubmoduleDotMessage = <name extends string>(
	name: name
): writeNonSubmoduleDotMessage<name> =>
	`'${name}' must reference a scope to be accessed using dot syntax`

type writeNonSubmoduleDotMessage<name extends string> =
	`'${name}' must reference a scope to be accessed using dot syntax`

export const writeMissingSubmoduleAccessMessage = <name extends string>(
	name: name
): writeMissingSubmoduleAccessMessage<name> =>
	`Reference to submodule '${name}' must specify an alias`

export type writeMissingSubmoduleAccessMessage<name extends string> =
	`Reference to submodule '${name}' must specify an alias`

/** Provide valid completions for the current token, or fallback to an
 * unresolvable error if there are none */
export type unresolvableError<
	s extends StaticState,
	token extends string,
	$,
	args,
	submodulePath extends string[]
> = validReferenceFromToken<token, $, args, submodulePath> extends never
	? ErrorMessage<
			writeUnresolvableMessage<qualifiedReference<token, submodulePath>>
	  >
	: Completion<`${s["scanned"]}${qualifiedReference<
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

export const writeUnresolvableMessage = <token extends string>(
	token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

type writeUnresolvableMessage<token extends string> =
	`'${token}' is unresolvable`

export const writeMissingOperandMessage = <s extends DynamicState>(s: s) => {
	const operator = s.previousOperator()
	return operator
		? writeMissingRightOperandMessage(operator, s.scanner.unscanned)
		: writeExpressionExpectedMessage(s.scanner.unscanned)
}

export type writeMissingOperandMessage<
	s extends StaticState,
	operator extends string | undefined = state.previousOperator<s>
> = operator extends string
	? writeMissingRightOperandMessage<operator, s["unscanned"]>
	: writeExpressionExpectedMessage<s["unscanned"]>

export type writeMissingRightOperandMessage<
	token extends string,
	unscanned extends string = ""
> = `Token '${token}' requires a right operand${unscanned extends ""
	? ""
	: ` before '${unscanned}'`}`

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
) => `Expected an expression${unscanned ? ` before '${unscanned}'` : ""}`

export type writeExpressionExpectedMessage<unscanned extends string> =
	`Expected an expression${unscanned extends ""
		? ""
		: ` before '${unscanned}'`}`
