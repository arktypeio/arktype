import type { Backslash, contains, ErrorMessage, Scanner } from "@ark/util"
import type { parseCharset } from "./charset.ts"
import type { parseEscape } from "./escape.ts"
import type { parseGroup } from "./group.ts"
import type {
	loneClosingBraceMessage,
	parseBuiltinQuantifier,
	parsePossibleRange,
	QuantifyingChar
} from "./quantify.ts"
import type { UnicodeFlag } from "./regex.ts"
import type { Anchor, AnchorMarker, CasedBudget, s, State } from "./state.ts"

export type parseState<s extends State> =
	s["unscanned"] extends ErrorMessage ? s["unscanned"]
	: s["unscanned"] extends "" ? s.finalize<s>
	: parseState<next<s>>

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet
export type next<s extends State> =
	s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "." ? s.shiftQuantifiable<s, string, unscanned>
		: lookahead extends Backslash ? parseEscape<s, unscanned>
		: lookahead extends "|" ? s.finalizeBranch<s, unscanned>
		: lookahead extends Anchor ?
			// with m, ^ and $ also match at line breaks, so they don't anchor the pattern
			s["multiline"] extends true ?
				s.shiftQuantifiable<s, "", unscanned>
			:	s.anchor<s, AnchorMarker<lookahead>, unscanned>
		: lookahead extends "(" ? parseGroup<s, unscanned>
		: lookahead extends ")" ? s.popGroup<s, unscanned>
		: lookahead extends QuantifyingChar ?
			parseBuiltinQuantifier<s, lookahead, unscanned>
		: lookahead extends "{" ? parsePossibleRange<s, unscanned>
		: lookahead extends "}" ?
			contains<s["flags"], UnicodeFlag> extends true ?
				s.error<loneClosingBraceMessage>
			:	s.shiftQuantifiable<s, "}", unscanned>
		: lookahead extends "[" ? parseCharset<s, unscanned>
		: s["caseInsensitive"] extends false ?
			s.shiftQuantifiable<s, lookahead, unscanned>
		:	shiftCaseInsensitiveChar<s, lookahead, unscanned>
	:	never

type shiftCaseInsensitiveChar<
	s extends State,
	char extends string,
	unscanned extends string
> =
	Lowercase<char> extends Uppercase<char> ?
		s.shiftQuantifiable<s, char, unscanned>
	: s["caseInsensitive"] extends CasedBudget ?
		s["caseInsensitive"][0]["length"] extends 5 ?
			s.shiftQuantifiable<s, string, unscanned>
		:	s.shiftCasedChar<s, Lowercase<char> | Uppercase<char>, unscanned>
	:	s.shiftQuantifiable<s, char, unscanned>
