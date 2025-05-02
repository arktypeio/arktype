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
import type { Anchor, AnchorMarker, s, State, UnionTree } from "./state.ts"

export type parseState<s extends State> =
	s["unscanned"] extends ErrorMessage ? Regex<s["unscanned"]>
	: s["unscanned"] extends "" ? s.finalize<s>
	: parseState<next<s>>

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet
export type next<s extends State> =
	s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "." ? s.shiftQuantifiable<s, string, unscanned>
		: lookahead extends Backslash ? parseEscape<s, unscanned>
		: lookahead extends "|" ? s.finalizeBranch<s, unscanned>
		: lookahead extends Anchor ? s.anchor<s, AnchorMarker<lookahead>, unscanned>
		: lookahead extends "(" ? parseGroup<s, unscanned>
		: lookahead extends ")" ? s.popGroup<s, unscanned>
		: lookahead extends QuantifyingChar ?
			parseBuiltinQuantifier<s, lookahead, unscanned>
		: lookahead extends "{" ? parsePossibleRange<s, unscanned>
		: lookahead extends "[" ? parseCharset<s, unscanned>
		: s.shiftQuantifiable<
				s,
				maybeSplitCasing<s["caseInsensitive"], lookahead>,
				unscanned
			>
	:	never

type maybeSplitCasing<caseInsensitive extends boolean, char extends string> =
	caseInsensitive extends false ? char
	: Lowercase<char> extends Uppercase<char> ? char
	: UnionTree<[Lowercase<char>, Capitalize<char>], [1, 1]>
