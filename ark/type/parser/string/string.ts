import type { Schema } from "@arktype/schema"
import {
	throwInternalError,
	throwParseError,
	type ErrorMessage
} from "@arktype/util"
import type { inferAstRoot } from "../semantic/infer.js"
import type { DynamicState, DynamicStateWithRoot } from "./reduce/dynamic.js"
import type { StringifiablePrefixOperator } from "./reduce/shared.js"
import type { StaticState, state } from "./reduce/static.js"
import type { parseOperand } from "./shift/operand/operand.js"
import {
	writeUnexpectedCharacterMessage,
	type parseOperator
} from "./shift/operator/operator.js"

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
export type parseString<def extends string, $, args> = def extends keyof $
	? // def could also be a generic reference here, in which case it will
		// fail semantic validation because it has no args
		def
	: def extends `${infer child}[]`
		? child extends keyof $
			? [child, "[]"]
			: fullStringParse<state.initialize<def>, $, args>
		: fullStringParse<state.initialize<def>, $, args>

export type inferString<def extends string, $, args> = inferAstRoot<
	parseString<def, $, args>,
	$,
	args
>

export type BaseCompletions<$, args, otherSuggestions extends string = never> =
	| (keyof $ & string)
	| (keyof args & string)
	| StringifiablePrefixOperator
	| otherSuggestions

export const fullStringParse = (s: DynamicState): Schema => {
	s.parseOperand()
	const result = parseUntilFinalizer(s).root
	if (!result) {
		return throwInternalError(
			`Root was unexpectedly unset after parsing string '${s.scanner.scanned}'`
		)
	}
	s.scanner.shiftUntilNonWhitespace()
	if (s.scanner.lookahead) {
		// throw a parse error if non-whitespace characters made it here without being parsed
		throwParseError(writeUnexpectedCharacterMessage(s.scanner.lookahead))
	}
	return result
}

type fullStringParse<s extends StaticState, $, args> = extractFinalizedResult<
	parseUntilFinalizer<s, $, args>
>

export const parseUntilFinalizer = (s: DynamicState): DynamicStateWithRoot => {
	while (s.finalizer === undefined) {
		next(s)
	}
	return s as DynamicStateWithRoot
}

export type parseUntilFinalizer<
	s extends StaticState,
	$,
	args
> = s["finalizer"] extends undefined
	? parseUntilFinalizer<next<s, $, args>, $, args>
	: s

const next = (s: DynamicState) =>
	s.hasRoot() ? s.parseOperator() : s.parseOperand()

type next<s extends StaticState, $, args> = s["root"] extends undefined
	? parseOperand<s, $, args>
	: parseOperator<s, $, args>

export type extractFinalizedResult<s extends StaticState> =
	s["finalizer"] extends ErrorMessage
		? s["finalizer"]
		: s["finalizer"] extends ""
			? s["root"]
			: state.error<writeUnexpectedCharacterMessage<`${s["finalizer"]}`>>
