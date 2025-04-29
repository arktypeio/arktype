import type { Backslash, ErrorMessage, Scanner } from "@ark/util"
import type { parseCharset } from "./charset.ts"
import type { parseEscape } from "./escape.ts"
import type { parseGroup } from "./group.ts"
import type {
	BuiltinQuantifier,
	parseBuiltinQuantifier,
	parsePossibleRange
} from "./quantify.ts"
import type { Anchor, s, State } from "./state.ts"

export type parse<s extends State> =
	s["unscanned"] extends "" ? s.finalize<s>
	: s["unscanned"] extends ErrorMessage ? s["unscanned"]
	: parse<next<s>>

type next<s extends State> =
	s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "." ? s.shiftQuantifiable<s, [string], unscanned>
		: lookahead extends Backslash ? parseEscape<s, unscanned>
		: lookahead extends "|" ? s.finalizeBranch<s, unscanned>
		: lookahead extends Anchor ? s.anchor<s, lookahead, unscanned>
		: lookahead extends "(" ? parseGroup<s, unscanned>
		: lookahead extends ")" ? s.popGroup<s, unscanned>
		: lookahead extends BuiltinQuantifier ?
			parseBuiltinQuantifier<s, lookahead, unscanned>
		: lookahead extends "{" ? parsePossibleRange<s, unscanned>
		: lookahead extends "[" ? parseCharset<s, unscanned>
		: s.shiftQuantifiable<s, [lookahead], unscanned>
	:	never
