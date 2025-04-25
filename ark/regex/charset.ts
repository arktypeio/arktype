import type { Scanner, writeUnclosedGroupMessage } from "@ark/util"
import type { s, State } from "./state.ts"

export type parseCharset<s extends State, unscanned extends string> =
	Scanner.shiftUntil<unscanned, "]"> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends `]${infer remaining}` ?
			// we don't care about the contents of the negated char set because we can't infer it
			scanned extends Scanner.shift<"^", string> ?
				s.shiftQuantifiable<s, [string], remaining>
			:	s.shiftQuantifiable<s, parseNonNegatedCharset<scanned>, remaining>
		:	writeUnclosedGroupMessage<"]">
	:	never

type parseNonNegatedCharset<chars extends string, set extends string[] = []> =
	chars extends Scanner.shift<infer lookahead, infer unscanned> ?
		parseNonNegatedCharset<unscanned, [...set, lookahead]>
	:	set
