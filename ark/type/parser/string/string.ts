import type { Schema, ambient } from "@arktype/schema"
import {
	type ErrorMessage,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import type { inferAstRoot } from "../semantic/infer.js"
import type { DynamicState, DynamicStateWithRoot } from "./reduce/dynamic.js"
import type { StringifiablePrefixOperator } from "./reduce/shared.js"
import type { StaticState, state } from "./reduce/static.js"
import type { parseOperand } from "./shift/operand/operand.js"
import {
	type parseOperator,
	writeUnexpectedCharacterMessage
} from "./shift/operator/operator.js"

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
export type parseString<def extends string, $> = def extends
	| keyof $
	| keyof ambient
	? // def could also be a generic reference here, in which case it will
		// fail semantic validation because it has no args
		def
	: def extends `${infer child}[]`
		? child extends keyof $ | keyof ambient
			? [child, "[]"]
			: fullStringParse<state.initialize<def>, $>
		: fullStringParse<state.initialize<def>, $>

export type inferString<def extends string, $> = inferAstRoot<
	parseString<def, $>,
	$
>

export type BaseCompletions<$, otherSuggestions extends string = never> =
	| (keyof $ & string)
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

type fullStringParse<s extends StaticState, $> = extractFinalizedResult<
	parseUntilFinalizer<s, $>
>

export const parseUntilFinalizer = (s: DynamicState): DynamicStateWithRoot => {
	while (s.finalizer === undefined) {
		next(s)
	}
	return s as DynamicStateWithRoot
}

export type parseUntilFinalizer<
	s extends StaticState,
	$
> = s["finalizer"] extends undefined ? parseUntilFinalizer<next<s, $>, $> : s

const next = (s: DynamicState) =>
	s.hasRoot() ? s.parseOperator() : s.parseOperand()

type next<s extends StaticState, $> = s["root"] extends undefined
	? parseOperand<s, $>
	: parseOperator<s, $>

export type extractFinalizedResult<s extends StaticState> =
	s["finalizer"] extends ErrorMessage
		? s["finalizer"]
		: s["finalizer"] extends ""
			? s["root"]
			: state.error<writeUnexpectedCharacterMessage<`${s["finalizer"]}`>>
