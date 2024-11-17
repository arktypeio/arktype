import { whitespaceChars, type WhitespaceChar } from "@ark/util"
import type { DynamicState } from "../../reduce/dynamic.ts"
import type { StaticState, state } from "../../reduce/static.ts"
import type { BaseCompletions } from "../../string.ts"
import type { ArkTypeScanner } from "../scanner.ts"
import {
	enclosingChar,
	enclosingQuote,
	parseEnclosed,
	type EnclosingQuote,
	type EnclosingStartToken
} from "./enclosed.ts"
import { parseUnenclosed, writeMissingOperandMessage } from "./unenclosed.ts"

export const parseOperand = (s: DynamicState): void =>
	s.scanner.lookahead === "" ? s.error(writeMissingOperandMessage(s))
	: s.scanner.lookahead === "(" ? s.shiftedByOne().reduceGroupOpen()
	: s.scanner.lookaheadIsIn(enclosingChar) ? parseEnclosed(s, s.scanner.shift())
	: s.scanner.lookaheadIsIn(whitespaceChars) ? parseOperand(s.shiftedByOne())
	: s.scanner.lookahead === "d" ?
		s.scanner.nextLookahead in enclosingQuote ?
			parseEnclosed(
				s,
				`${s.scanner.shift()}${s.scanner.shift()}` as EnclosingStartToken
			)
		:	parseUnenclosed(s)
	:	parseUnenclosed(s)

export type parseOperand<s extends StaticState, $, args> =
	s["unscanned"] extends (
		ArkTypeScanner.shift<infer lookahead, infer unscanned>
	) ?
		lookahead extends "(" ? state.reduceGroupOpen<s, unscanned>
		: lookahead extends EnclosingStartToken ?
			parseEnclosed<s, lookahead, unscanned>
		: lookahead extends WhitespaceChar ?
			parseOperand<state.scanTo<s, unscanned>, $, args>
		: lookahead extends "d" ?
			unscanned extends (
				ArkTypeScanner.shift<
					infer enclosing extends EnclosingQuote,
					infer nextUnscanned
				>
			) ?
				parseEnclosed<s, `d${enclosing}`, nextUnscanned>
			:	parseUnenclosed<s, $, args>
		:	parseUnenclosed<s, $, args>
	:	state.completion<`${s["scanned"]}${BaseCompletions<$, args>}`>
