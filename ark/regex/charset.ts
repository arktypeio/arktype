import type {
	Backslash,
	contains,
	ErrorMessage,
	noSuggest,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type {
	NonZeroDigit,
	RegexClassChar,
	StringDigit,
	writeUnnecessaryEscapeMessage
} from "./escape.ts"
import type { UnicodeFlag } from "./regex.ts"
import type { Control, s, State } from "./state.ts"

export type parseCharset<s extends State, unscanned extends string> =
	Scanner.shiftUntilEscapable<unscanned, "]", Backslash> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends `]${infer remaining}` ?
			// we don't care about the contents of the negated char set because we can't infer it
			scanned extends Scanner.shift<"^", string> ?
				s.shiftQuantifiable<s, string, remaining>
			: parseNonNegatedCharset<
				scanned,
				never,
				null,
				contains<s["flags"], UnicodeFlag>
			> extends infer result extends string ?
				[result] extends [never] ? s.error<emptyCharacterSetMessage>
				: result extends ErrorMessage ? s.error<result>
				: s.shiftQuantifiable<s, result, remaining>
			:	never
		:	s.error<writeUnclosedGroupMessage<"]">>
	:	never

type parseNonNegatedCharset<
	chars extends string,
	set extends string,
	lastChar extends string | null,
	unicode extends boolean
> =
	parseChar<chars, unicode> extends (
		Scanner.shiftResult<infer result, infer unscanned>
	) ?
		result extends UnescapedDashMarker ?
			parseDash<unscanned, set, lastChar, unicode>
		: result extends ErrorMessage ? result
		: parseNonNegatedCharset<unscanned, set | result, result, unicode>
	:	set

type parseDash<
	unscanned extends string,
	set extends string,
	lastChar extends string | null,
	unicode extends boolean
> =
	lastChar extends string ?
		// we have a last character to use as range start
		parseChar<unscanned, unicode> extends (
			Scanner.shiftResult<infer rangeEnd, infer next>
		) ?
			rangeEnd extends ErrorMessage ?
				rangeEnd
			:	parseNonNegatedCharset<
					next,
					set | inferRange<lastChar, rangeEnd>,
					null,
					unicode
				>
		:	// trailing -, treat as literal
			set | "-"
	:	// leading -, treat as literal (lastChar is null)
		parseNonNegatedCharset<unscanned, set | "-", "-", unicode>

// don't infer the full union of characters for ranges as it would blow up tsc
// immediately, but handle cases like 0-9 better than just `string`
type inferRange<start extends string, end extends string> =
	start | end extends StringDigit ? `${number}` : string

type UnescapedDashMarker = noSuggest<"dash">

type parseChar<unscanned extends string, unicode extends boolean> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends Backslash ?
			next extends Scanner.shift<infer escaped, infer postEscaped> ?
				Scanner.shiftResult<parseEscapedSetChar<escaped, unicode>, postEscaped>
			:	never
		:	Scanner.shiftResult<
				lookahead extends "-" ? UnescapedDashMarker : lookahead,
				next
			>
	:	// return null if called on an empty string
		null

// in a set, \b is a backspace and an escape that's unnecessary elsewhere
// matches its character, unless the u or v flag makes it a SyntaxError
type parseEscapedSetChar<char extends string, unicode extends boolean> =
	char extends "b" ? "\b"
	: char extends "d" ? `${number}`
	: char extends keyof EscapedControlChars ? EscapedControlChars[char]
	: // these can match characters other than the one escaped
	char extends "0" | "c" | "x" | "u" | "p" | "P" | "s" | RegexClassChar ? string
	: unicode extends true ?
		char extends Control | "/" ?
			char
		:	ErrorMessage<writeUnnecessaryEscapeMessage<char>>
	: // a legacy octal escape like \1
	char extends NonZeroDigit ? string
	: char

type EscapedControlChars = {
	n: "\n"
	t: "\t"
	r: "\r"
	f: "\f"
	v: "\v"
}

export const emptyCharacterSetMessage =
	"Empty character set [] is unsatisfiable"

export type emptyCharacterSetMessage = typeof emptyCharacterSetMessage
