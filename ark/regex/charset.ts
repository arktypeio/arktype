import type {
	ErrorMessage,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { ParsedEscapeSequence, parseEscapedChar } from "./escape.ts"
import type { parse } from "./parse.ts"
import type { s, State } from "./state.ts"

export type parseCharset<s extends State, unscanned extends string> =
	Scanner.shiftUntil<unscanned, "]"> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends `]${infer remaining}` ?
			// we don't care about the contents of the negated char set because we can't infer it
			scanned extends Scanner.shift<"^", string> ?
				s.shiftQuantifiable<s, [string], remaining>
			:	parseNonNegatedCharset<s, remaining>
		:	writeUnclosedGroupMessage<"]">
	:	never

type parseNonNegatedCharset<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer nextUnscanned> ?
		writeUnclosedGroupMessage<"]">
	:	writeUnclosedGroupMessage<"]">
