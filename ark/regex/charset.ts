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
	UnicodePropertyChar,
	writeInvalidUnicodePropertyMessage,
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
			scanned extends Scanner.shift<"^", infer negatedBody> ?
				parseNegatedCharset<
					s,
					negatedBody,
					remaining,
					contains<s["flags"], UnicodeFlag>
				>
			: parseNonNegatedCharset<
				scanned,
				never,
				null,
				contains<s["flags"], UnicodeFlag>
			> extends infer result extends string ?
				[result] extends [never] ? s.error<emptyCharacterSetMessage>
				: result extends ErrorMessage ? s.error<result>
				: s.shiftQuantifiable<
						s,
						applyCharsetCasing<s["caseInsensitive"], result>,
						remaining
					>
			:	never
		:	s.error<writeUnclosedGroupMessage<"]">>
	:	never

type parseNegatedCharset<
	s extends State,
	body extends string,
	remaining extends string,
	unicode extends boolean
> =
	body extends (
		`${string}${unicode extends true ? "-" | Backslash : "-"}${string}`
	) ?
		parseNonNegatedCharset<body, never, null, unicode> extends (
			infer result extends ErrorMessage
		) ?
			s.error<result>
		:	s.shiftQuantifiable<s, string, remaining>
	:	s.shiftQuantifiable<s, string, remaining>

type applyCharsetCasing<caseInsensitive extends boolean, chars extends string> =
	caseInsensitive extends false ? chars
	: string extends chars ? chars
	: expandCharsetCasing<chars>

type expandCharsetCasing<char extends string> =
	char extends unknown ?
		`${number}` extends char ?
			char
		:	Lowercase<char> | Uppercase<char>
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
			rangeEnd extends ErrorMessage ? rangeEnd
			: inferRange<
				lastChar,
				rangeEnd extends UnescapedDashMarker ? "-" : rangeEnd
			> extends infer ranged extends string ?
				ranged extends ErrorMessage ?
					ranged
				:	parseNonNegatedCharset<next, set | ranged, null, unicode>
			:	never
		:	// trailing -, treat as literal
			set | "-"
	:	// leading -, treat as literal (lastChar is null)
		parseNonNegatedCharset<unscanned, set | "-", "-", unicode>

type AsciiOrder =
	"\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u007f"

type isRangeOutOfOrder<start extends string, end extends string> =
	start extends end ? false
	: AsciiOrder extends `${string}${start}${string}${end}${string}` ? false
	: string extends start | end ? false
	: `${number}` extends start ? false
	: `${number}` extends end ? false
	: AsciiOrder extends `${string}${end}${string}${start}${string}` ? true
	: AsciiOrder extends `${string}${end}${string}` ? true
	: false

// don't infer the full union of characters for ranges as it would blow up tsc
// immediately, but handle cases like 0-9 better than just `string`
type inferRange<start extends string, end extends string> =
	isRangeOutOfOrder<start, end> extends true ?
		ErrorMessage<writeOutOfOrderRangeMessage<start, end>>
	: start | end extends StringDigit ? `${number}`
	: string

type UnescapedDashMarker = noSuggest<"dash">

type parseChar<unscanned extends string, unicode extends boolean> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends Backslash ?
			next extends Scanner.shift<infer escaped, infer postEscaped> ?
				unicode extends true ?
					escaped extends UnicodePropertyChar ?
						postEscaped extends `{${infer prop}}${infer afterProp}` ?
							prop extends "" ?
								Scanner.shiftResult<
									ErrorMessage<writeInvalidUnicodePropertyMessage<escaped>>,
									""
								>
							:	Scanner.shiftResult<string, afterProp>
						:	Scanner.shiftResult<
								ErrorMessage<writeInvalidUnicodePropertyMessage<escaped>>,
								""
							>
					:	Scanner.shiftResult<parseEscapedSetChar<escaped, true>, postEscaped>
				:	Scanner.shiftResult<parseEscapedSetChar<escaped, false>, postEscaped>
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
	char extends "0" | "c" | "x" | "u" | "s" | RegexClassChar ? string
	: char extends "p" | "P" ?
		unicode extends true ?
			string
		:	char
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

export const writeOutOfOrderRangeMessage = <
	start extends string,
	end extends string
>(
	start: start,
	end: end
): writeOutOfOrderRangeMessage<start, end> =>
	`Range '${start}-${end}' is out of order in character class`

export type writeOutOfOrderRangeMessage<
	start extends string,
	end extends string
> = `Range '${start}-${end}' is out of order in character class`
