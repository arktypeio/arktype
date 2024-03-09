import type { type } from "arktype"
import type { DynamicState } from "../../reduce/dynamic.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { BaseCompletions } from "../../string.js"
import { Scanner } from "../scanner.js"
import {
	enclosingChar,
	parseEnclosed,
	type EnclosingQuote,
	type EnclosingStartToken
} from "./enclosed.js"
import { parseUnenclosed, writeMissingOperandMessage } from "./unenclosed.js"

export const parseOperand = (s: DynamicState): void =>
	s.scanner.lookahead === ""
		? s.error(writeMissingOperandMessage(s))
		: s.scanner.lookahead === "("
		? s.shiftedByOne().reduceGroupOpen()
		: s.scanner.lookaheadIsIn(enclosingChar)
		? parseEnclosed(s, s.scanner.shift())
		: s.scanner.lookaheadIsIn(Scanner.whiteSpaceTokens)
		? parseOperand(s.shiftedByOne())
		: s.scanner.lookahead === "d"
		? s.shiftedByOne().scanner.lookaheadIsIn(enclosingChar)
			? parseEnclosed(s, `d${s.scanner.shift()}` as EnclosingStartToken)
			: parseUnenclosed(s)
		: parseUnenclosed(s)

export type parseOperand<
	s extends StaticState,
	$,
	args
> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
	? lookahead extends "("
		? state.reduceGroupOpen<s, unscanned>
		: lookahead extends EnclosingStartToken
		? parseEnclosed<s, lookahead, unscanned>
		: lookahead extends Scanner.WhiteSpaceToken
		? parseOperand<state.scanTo<s, unscanned>, $, args>
		: lookahead extends "d"
		? unscanned extends Scanner.shift<
				infer enclosing extends EnclosingQuote,
				infer nextUnscanned
		  >
			? parseEnclosed<s, `d${enclosing}`, nextUnscanned>
			: parseUnenclosed<s, $, args>
		: parseUnenclosed<s, $, args>
	: state.completion<`${s["scanned"]}${BaseCompletions<$, args>}`>
