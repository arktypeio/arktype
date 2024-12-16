import type { BaseParseContext, resolvableReferenceIn } from "@ark/schema"
import {
	throwInternalError,
	throwParseError,
	type ErrorMessage
} from "@ark/util"
import type { ArkAmbient } from "../config.ts"
import type { InnerParseResult, resolutionToAst } from "../scope.ts"
import type { inferAstRoot } from "./ast/infer.ts"
import { DynamicState, type DynamicStateWithRoot } from "./reduce/dynamic.ts"
import type { StringifiablePrefixOperator } from "./reduce/shared.ts"
import type { state, StaticState } from "./reduce/static.ts"
import type { parseOperand } from "./shift/operand/operand.ts"
import { parseDefault } from "./shift/operator/default.ts"
import {
	writeUnexpectedCharacterMessage,
	type parseOperator
} from "./shift/operator/operator.ts"
import { ArkTypeScanner } from "./shift/scanner.ts"

export const parseString = (
	def: string,
	ctx: BaseParseContext
): InnerParseResult => {
	const aliasResolution = ctx.$.maybeResolveRoot(def)
	if (aliasResolution) return aliasResolution

	const aliasArrayResolution =
		def.endsWith("[]") ?
			ctx.$.maybeResolveRoot(def.slice(0, -2))?.array()
		:	undefined

	if (aliasArrayResolution) return aliasArrayResolution

	const s = new DynamicState(new ArkTypeScanner(def), ctx)

	const node = fullStringParse(s)

	if (s.finalizer === ">") throwParseError(writeUnexpectedCharacterMessage(">"))

	return node
}

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions.
 */
export type parseString<def extends string, $, args> =
	def extends keyof $ ?
		// def could also be a generic reference here, in which case it will
		// fail semantic validation because it has no args
		resolutionToAst<def, $[def]>
	: def extends `${infer child}[]` ?
		child extends keyof $ ?
			[resolutionToAst<child, $[child]>, "[]"]
		:	fullStringParse<state.initialize<def>, $, args>
	:	fullStringParse<state.initialize<def>, $, args>

export type inferString<def extends string, $, args> = inferAstRoot<
	parseString<def, $, args>,
	$,
	args
>

export type BaseCompletions<$, args, otherSuggestions extends string = never> =
	| resolvableReferenceIn<$>
	| resolvableReferenceIn<ArkAmbient.$>
	| (keyof args & string)
	| StringifiablePrefixOperator
	| otherSuggestions

export const fullStringParse = (s: DynamicState): InnerParseResult => {
	s.parseOperand()
	let result: InnerParseResult = parseUntilFinalizer(s).root
	if (!result) {
		return throwInternalError(
			`Root was unexpectedly unset after parsing string '${s.scanner.scanned}'`
		)
	}

	if (s.finalizer === "=") result = parseDefault(s as DynamicStateWithRoot)
	else if (s.finalizer === "?") result = [result, "?"]

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
	while (s.finalizer === undefined) next(s)

	return s as DynamicStateWithRoot
}

export type parseUntilFinalizer<s extends StaticState, $, args> =
	s["finalizer"] extends undefined ?
		parseUntilFinalizer<next<s, $, args>, $, args>
	:	s

const next = (s: DynamicState): void =>
	s.hasRoot() ? s.parseOperator() : s.parseOperand()

type next<s extends StaticState, $, args> =
	s["root"] extends undefined ? parseOperand<s, $, args>
	:	parseOperator<s, $, args>

export type extractFinalizedResult<s extends StaticState> =
	s["finalizer"] extends "" ? s["root"]
	: s["finalizer"] extends ErrorMessage ? s["finalizer"]
	: s["finalizer"] extends "?" ? [s["root"], "?"]
	: s["finalizer"] extends "=" ? parseDefault<s["root"], s["unscanned"]>
	: state.error<writeUnexpectedCharacterMessage<`${s["finalizer"]}`>>
