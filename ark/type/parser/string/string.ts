import { type Root } from "@arktype/schema"
import { type ErrorMessage, throwParseError } from "@arktype/util"
import type { ParseContext } from "../../scope.ts"
import { type inferAst } from "../semantic/semantic.ts"
import { writeUnsatisfiableExpressionError } from "../semantic/validate.ts"
import type { DynamicStateWithRoot } from "./reduce/dynamic.ts"
import { DynamicState } from "./reduce/dynamic.ts"
import type { StringifiablePrefixOperator } from "./reduce/shared.ts"
import type { state, StaticState } from "./reduce/static.ts"
import { parseOperand } from "./shift/operand/operand.ts"
import {
	parseOperator,
	writeUnexpectedCharacterMessage
} from "./shift/operator/operator.ts"

export const parseString = (def: string, ctx: ParseContext): Root =>
	ctx.scope.maybeResolveNode(def) ??
	((def.endsWith("[]") &&
		ctx.scope.maybeResolveNode(def.slice(0, -2))?.array()) ||
		fullStringParse(def, ctx))

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
		: fullStringParse<def, $, args>
	: fullStringParse<def, $, args>

export type inferString<def extends string, $, args> = inferAst<
	parseString<def, $, args>,
	$,
	args
>

export type BaseCompletions<$, args, otherSuggestions extends string = never> =
	| (keyof $ & string)
	| (keyof args & string)
	| StringifiablePrefixOperator
	| otherSuggestions

export const fullStringParse = (def: string, ctx: ParseContext) => {
	const s = new DynamicState(def, ctx)
	parseOperand(s)
	const result = parseUntilFinalizer(s).root
	s.scanner.shiftUntilNonWhitespace()
	if (s.scanner.lookahead) {
		// throw a parse error if non-whitespace characters made it here without being parsed
		throwParseError(writeUnexpectedCharacterMessage(s.scanner.lookahead))
	}
	return result.isNever()
		? throwParseError(writeUnsatisfiableExpressionError(def))
		: result
}

type fullStringParse<def extends string, $, args> = extractFinalizedResult<
	parseUntilFinalizer<state.initialize<def>, $, args>
>

export const parseUntilFinalizer = (s: DynamicState) => {
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
	s.hasRoot() ? parseOperator(s) : parseOperand(s)

type next<s extends StaticState, $, args> = s["root"] extends undefined
	? parseOperand<s, $, args>
	: parseOperator<s, $, args>

export type extractFinalizedResult<s extends StaticState> =
	s["finalizer"] extends ErrorMessage
		? s["finalizer"]
		: s["finalizer"] extends ""
		? s["root"]
		: state.error<writeUnexpectedCharacterMessage<`${s["finalizer"]}`>>
