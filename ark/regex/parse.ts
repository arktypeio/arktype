import type { Backslash, ErrorMessage, Scanner } from "@ark/util"
import type { parseCharset } from "./charset.ts"
import type { parseEscape } from "./escape.ts"
import type { parseGroup } from "./group.ts"
import type {
	parseBuiltinQuantifier,
	parsePossibleRange,
	QuantifyingChar
} from "./quantify.ts"
import type { Regex } from "./regex.ts"
import type { Anchor, s, State } from "./state.ts"

type Result = iterate<State.initialize<"^(a)b\\1$">, 4>

export type parseState<s extends State> =
	s["unscanned"] extends ErrorMessage ? Regex<s["unscanned"]>
	: s["unscanned"] extends "" ? s.finalize<s>
	: parseState<next<s>>

type iterate<s extends State, until extends number, counter extends 1[] = []> =
	counter["length"] extends until ? s : iterate<next<s>, until, [...counter, 1]>

type next<s extends State> =
	s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "." ? s.shiftQuantifiable<s, [string], unscanned>
		: lookahead extends Backslash ? parseEscape<s, unscanned>
		: lookahead extends "|" ? s.finalizeBranch<s, unscanned>
		: lookahead extends Anchor ? s.anchor<s, lookahead, unscanned>
		: lookahead extends "(" ? parseGroup<s, unscanned>
		: lookahead extends ")" ? s.popGroup<s, unscanned>
		: lookahead extends QuantifyingChar ?
			parseBuiltinQuantifier<s, lookahead, unscanned>
		: lookahead extends "{" ? parsePossibleRange<s, unscanned>
		: lookahead extends "[" ? parseCharset<s, unscanned>
		: s.shiftQuantifiable<s, [lookahead], unscanned>
	:	never
