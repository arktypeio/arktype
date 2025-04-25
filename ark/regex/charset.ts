import type { Backslash, Scanner, writeUnclosedGroupMessage } from "@ark/util"
import type { parseEscapedChar } from "./escape.ts"
import type { s, State } from "./state.ts"

export type parseCharset<s extends State, unscanned extends string> =
	Scanner.shiftUntil<unscanned, "]"> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends `]${infer remaining}` ?
			// we don't care about the contents of the negated char set because we can't infer it
			scanned extends Scanner.shift<"^", string> ?
				s.shiftQuantifiable<s, [string], remaining>
			:	s.shiftQuantifiable<s, parseNonNegatedCharset<scanned, []>, remaining>
		:	writeUnclosedGroupMessage<"]">
	:	never

type parseNonNegatedCharset<chars extends string, set extends string[]> =
	parseChar<chars> extends Scanner.shiftResult<infer result, infer unscanned> ?
		chars extends Scanner.shift<infer lookahead, infer unscanned> ?
			{}
		:	{}
	:	// lookahead extends "-" ?
		// 	parseDash<unscanned, set>
		// :	parseNonNegatedCharset<unscanned, [...set, lookahead]>
		set

type parseDash<unscanned extends string, set extends string[]> =
	// leading -, treat as literal
	set extends [] ? parseNonNegatedCharset<unscanned, ["-"]>
	: unscanned extends Scanner.shift<infer rangeEnd, infer next> ?
		rangeEnd extends Backslash ? {}
		: next extends `-${infer postLiteralDash}` ?
			parseNonNegatedCharset<postLiteralDash, [...set, string, "-"]>
		:	parseNonNegatedCharset<next, [...set, string]>
	:	// trailing -, treat as literal
		[...set, "-"]

type parseEscape<unscanned extends string, set extends string[]> =
	unscanned extends Scanner.shift<infer char, infer postEscape> ?
		parseNonNegatedCharset<postEscape, [...set, parseEscapedChar<char>]>
	:	never

type parseChar<unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends Backslash ?
			next extends Scanner.shift<infer escaped, infer postEscaped> ?
				Scanner.shiftResult<parseEscapedChar<escaped>, postEscaped>
			:	never
		:	Scanner.shiftResult<lookahead, next>
	:	never
