import type {
	Backslash,
	contains,
	ErrorMessage,
	noSuggest,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type {
	isHexDigits,
	NonZeroDigit,
	RegexClassChar,
	shiftFourHexDigits,
	shiftTwoHexDigits,
	StringDigit,
	UnicodePropertyChar,
	writeInvalidUnicodePropertyMessage,
	writeUnnecessaryEscapeMessage
} from "./escape.ts"
import type { Flags, UnicodeFlag } from "./regex.ts"
import type { CasedBudget, Control, s, State } from "./state.ts"

type CharsetMode = "" | UnicodeFlag

type charsetModeOf<flags extends Flags> =
	contains<flags, "v"> extends true ? "v"
	: contains<flags, "u"> extends true ? "u"
	: ""

type UnicodeSetScanResult<
	scanned extends string = string,
	remaining extends string = string,
	nested extends boolean = boolean
> = [scanned: scanned, remaining: remaining, nested: nested]

// Under the ES2024 `v` flag, `[` opens a nested character class, so scanning for
// the closing `]` must track unescaped `[`/`]` nesting depth while preserving
// backslash escapes for subsequent character/escape validation.
type shiftUnicodeSetBody<
	unscanned extends string,
	depth extends 1[] = [1],
	nested extends boolean = false,
	acc extends string = ""
> =
	unscanned extends `${infer head}]${infer tail}` ?
		head extends `${string}${Backslash}${string}` ?
			unscanned extends `${infer beforeBs}${Backslash}${infer afterBs}` ?
				beforeBs extends `${infer beforeBracket}[${infer afterBracket}` ?
					shiftUnicodeSetBody<
						`${afterBracket}${Backslash}${afterBs}`,
						[...depth, 1],
						true,
						`${acc}${beforeBracket}[`
					>
				: afterBs extends Scanner.shift<infer escaped, infer rest> ?
					shiftUnicodeSetBody<
						rest,
						depth,
						nested,
						`${acc}${beforeBs}${Backslash}${escaped}`
					>
				:	null
			:	never
		: head extends `${infer beforeBracket}[${infer afterBracket}` ?
			shiftUnicodeSetBody<
				`${afterBracket}]${tail}`,
				[...depth, 1],
				true,
				`${acc}${beforeBracket}[`
			>
		: depth extends [1] ? UnicodeSetScanResult<`${acc}${head}`, tail, nested>
		: depth extends [1, ...infer parentDepth extends 1[]] ?
			shiftUnicodeSetBody<tail, parentDepth, nested, `${acc}${head}]`>
		:	never
	:	null

export type parseCharset<
	s extends State,
	unscanned extends string,
	mode extends CharsetMode = charsetModeOf<s["flags"]>
> =
	mode extends "v" ?
		shiftUnicodeSetBody<unscanned> extends (
			UnicodeSetScanResult<infer scanned, infer remaining, infer nested>
		) ?
			nested extends true ?
				s.shiftQuantifiable<s, string, remaining>
			:	parseScannedCharset<s, scanned, remaining, "v">
		:	s.error<writeUnclosedGroupMessage<"]">>
	: Scanner.shiftUntilEscapable<unscanned, "]", Backslash> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		nextUnscanned extends `]${infer remaining}` ?
			parseScannedCharset<s, scanned, remaining, mode>
		:	s.error<writeUnclosedGroupMessage<"]">>
	:	never

type parseScannedCharset<
	s extends State,
	scanned extends string,
	remaining extends string,
	mode extends CharsetMode
> =
	// we don't care about the contents of the negated char set because we can't infer it
	scanned extends Scanner.shift<"^", infer negatedBody> ?
		parseNegatedCharset<s, negatedBody, remaining, mode>
	: parseNonNegatedCharset<scanned, never, null, mode> extends (
		infer result extends string
	) ?
		[result] extends [never] ? s.error<emptyCharacterSetMessage>
		: result extends ErrorMessage ? s.error<result>
		: s["caseInsensitive"] extends false ?
			s.shiftQuantifiable<s, result, remaining>
		:	shiftCaseInsensitiveCharset<s, result, remaining>
	:	never

type parseNegatedCharset<
	s extends State,
	body extends string,
	remaining extends string,
	mode extends CharsetMode
> =
	body extends (
		`${string}${mode extends UnicodeFlag ? "-" | Backslash : "-"}${string}`
	) ?
		parseNonNegatedCharset<body, never, null, mode> extends (
			infer result extends ErrorMessage
		) ?
			s.error<result>
		:	s.shiftQuantifiable<s, string, remaining>
	:	s.shiftQuantifiable<s, string, remaining>

type shiftCaseInsensitiveCharset<
	s extends State,
	chars extends string,
	remaining extends string
> =
	string extends chars ? s.shiftQuantifiable<s, chars, remaining>
	: expandCharsetCasing<chars> extends infer expanded extends string ?
		[expanded] extends [chars] ? s.shiftQuantifiable<s, chars, remaining>
		: s["caseInsensitive"] extends CasedBudget ?
			s["caseInsensitive"][0]["length"] extends 5 ?
				s.shiftQuantifiable<s, string, remaining>
			:	s.shiftCasedChar<s, expanded, remaining>
		:	s.shiftQuantifiable<s, chars, remaining>
	:	never

type expandCharsetCasing<char extends string> =
	char extends unknown ?
		`${number}` extends char ?
			char
		:	Lowercase<char> | Uppercase<char>
	:	never

type ClassShorthand<t extends string = string> = {
	shorthand: t
}

type UnicodeSetOpMarker = noSuggest<"unicodeSetOp">

type unwrapRangeEndpoint<endpoint> =
	endpoint extends ClassShorthand<infer t> ? t
	: endpoint extends string ? endpoint
	: string

type parseNonNegatedCharset<
	chars extends string,
	set extends string,
	lastChar extends string | ClassShorthand | null,
	mode extends CharsetMode
> =
	parseChar<chars, mode> extends (
		[infer result, infer unscanned extends string]
	) ?
		result extends UnescapedDashMarker ?
			parseDash<unscanned, set, lastChar, mode>
		: result extends UnicodeSetOpMarker ? string
		: result extends ErrorMessage ? result
		: result extends ClassShorthand<infer t> ?
			parseNonNegatedCharset<unscanned, set | t, result, mode>
		: result extends string ?
			parseNonNegatedCharset<unscanned, set | result, result, mode>
		:	never
	:	set

type parseDash<
	unscanned extends string,
	set extends string,
	lastChar extends string | ClassShorthand | null,
	mode extends CharsetMode
> =
	lastChar extends string | ClassShorthand ?
		[mode, unscanned] extends ["v", `-${string}`] ?
			unscanned extends "-" ?
				parseRangeEnd<unscanned, set, lastChar, mode>
			:	string
		:	parseRangeEnd<unscanned, set, lastChar, mode>
	:	// leading -, treat as literal
		parseNonNegatedCharset<unscanned, set | "-", "-", mode>

type parseRangeEnd<
	unscanned extends string,
	set extends string,
	lastChar extends string | ClassShorthand,
	mode extends CharsetMode
> =
	parseChar<unscanned, mode> extends (
		[infer rangeEnd, infer next extends string]
	) ?
		rangeEnd extends ErrorMessage ? rangeEnd
		: rangeEnd extends UnicodeSetOpMarker ? string
		: mode extends UnicodeFlag ?
			lastChar extends ClassShorthand ? ErrorMessage<invalidClassRangeMessage>
			: rangeEnd extends ClassShorthand ? ErrorMessage<invalidClassRangeMessage>
			: inferRangeAndContinue<
					lastChar & string,
					rangeEnd extends UnescapedDashMarker ? "-" : rangeEnd & string,
					next,
					set,
					mode
				>
		:	inferRangeAndContinue<
				unwrapRangeEndpoint<lastChar>,
				rangeEnd extends UnescapedDashMarker ? "-"
				:	unwrapRangeEndpoint<rangeEnd>,
				next,
				set,
				mode
			>
	:	// trailing -, treat as literal
		set | "-"

type inferRangeAndContinue<
	start extends string,
	end extends string,
	next extends string,
	set extends string,
	mode extends CharsetMode
> =
	inferRange<start, end> extends infer ranged extends string ?
		ranged extends ErrorMessage ?
			ranged
		:	parseNonNegatedCharset<next, set | ranged, null, mode>
	:	never

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

type OctalDigit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7"

type LowOctalStart = "0" | "1" | "2" | "3"

type AsciiLetter =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z"
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I"
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P"
	| "Q"
	| "R"
	| "S"
	| "T"
	| "U"
	| "V"
	| "W"
	| "X"
	| "Y"
	| "Z"

type ClassSetReservedPunctuator =
	| "!"
	| "#"
	| "%"
	| "&"
	| ","
	| ":"
	| ";"
	| "<"
	| "="
	| ">"
	| "@"
	| "`"
	| "~"

type consumeOctal0To3<s extends string> =
	s extends `${OctalDigit}${OctalDigit}${infer rest}` ? rest
	: s extends `${OctalDigit}${infer rest}` ? rest
	: s

type consumeOctal4To7<s extends string> =
	s extends `${OctalDigit}${infer rest}` ? rest : s

type parseChar<unscanned extends string, mode extends CharsetMode> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends Backslash ?
			next extends Scanner.shift<infer escaped, infer postEscaped> ?
				parseEscapedSetSequence<escaped, postEscaped, mode>
			:	never
		: [mode, lookahead, next] extends ["v", "&", `&${string}`] ?
			[UnicodeSetOpMarker, next]
		:	[lookahead extends "-" ? UnescapedDashMarker : lookahead, next]
	:	// return null if called on an empty string
		null

type parseEscapedSetSequence<
	escaped extends string,
	postEscaped extends string,
	mode extends CharsetMode
> =
	escaped extends UnicodePropertyChar ?
		mode extends UnicodeFlag ?
			postEscaped extends `{${infer prop}}${infer afterProp}` ?
				prop extends "" ?
					[ErrorMessage<writeInvalidUnicodePropertyMessage<escaped>>, ""]
				:	[ClassShorthand<string>, afterProp]
			:	[ErrorMessage<writeInvalidUnicodePropertyMessage<escaped>>, ""]
		:	[escaped, postEscaped]
	: escaped extends "q" ?
		mode extends "v" ?
			postEscaped extends `{${infer qBody}` ?
				Scanner.shiftUntilEscapable<qBody, "}", Backslash> extends (
					Scanner.shiftResult<string, infer nextQ>
				) ?
					nextQ extends `}${infer afterQ}` ?
						[ClassShorthand<string>, afterQ]
					:	[ErrorMessage<invalidClassStringDisjunctionMessage>, ""]
				:	never
			:	[ErrorMessage<invalidClassStringDisjunctionMessage>, ""]
		: mode extends "u" ? [ErrorMessage<writeUnnecessaryEscapeMessage<"q">>, ""]
		: ["q", postEscaped]
	: escaped extends "x" ?
		shiftTwoHexDigits<postEscaped> extends infer afterHex extends string ?
			[string, afterHex]
		: mode extends UnicodeFlag ? [ErrorMessage<invalidHexEscapeMessage>, ""]
		: ["x", postEscaped]
	: escaped extends "u" ?
		mode extends UnicodeFlag ?
			postEscaped extends `{${infer hex}}${infer afterBraced}` ?
				isHexDigits<hex> extends true ?
					[string, afterBraced]
				:	[ErrorMessage<invalidUnicodeEscapeMessage>, ""]
			: shiftFourHexDigits<postEscaped> extends infer afterU4 extends string ?
				[string, afterU4]
			:	[ErrorMessage<invalidUnicodeEscapeMessage>, ""]
		: shiftFourHexDigits<postEscaped> extends infer afterU4 extends string ?
			[string, afterU4]
		:	["u", postEscaped]
	: escaped extends "c" ?
		mode extends UnicodeFlag ?
			postEscaped extends Scanner.shift<infer ctrl, infer afterCtrl> ?
				ctrl extends AsciiLetter ?
					[string, afterCtrl]
				:	[ErrorMessage<invalidControlEscapeMessage>, ""]
			:	[ErrorMessage<invalidControlEscapeMessage>, ""]
		: postEscaped extends Scanner.shift<infer ctrl, infer afterCtrl> ?
			ctrl extends AsciiLetter | StringDigit | "_" ?
				[string, afterCtrl]
			:	["c", postEscaped]
		:	["c", postEscaped]
	: escaped extends "0" ?
		mode extends UnicodeFlag ?
			postEscaped extends `${StringDigit}${string}` ?
				[ErrorMessage<invalidDecimalEscapeMessage>, ""]
			:	["\0", postEscaped]
		: postEscaped extends `${OctalDigit}${string}` ?
			[string, consumeOctal0To3<postEscaped>]
		:	["\0", postEscaped]
	: escaped extends NonZeroDigit ?
		mode extends UnicodeFlag ?
			[ErrorMessage<writeUnnecessaryEscapeMessage<escaped>>, ""]
		: escaped extends OctalDigit ?
			[
				string,
				escaped extends LowOctalStart ? consumeOctal0To3<postEscaped>
				:	consumeOctal4To7<postEscaped>
			]
		:	[escaped, postEscaped]
	: escaped extends "d" ? [ClassShorthand<`${number}`>, postEscaped]
	: escaped extends "s" | RegexClassChar ? [ClassShorthand<string>, postEscaped]
	: // in a set, \b is a backspace and an escape that's unnecessary elsewhere
	// matches its character, unless the u or v flag makes it a SyntaxError
	escaped extends "b" ? ["\b", postEscaped]
	: escaped extends keyof EscapedControlChars ?
		[EscapedControlChars[escaped], postEscaped]
	: mode extends "v" ?
		escaped extends Control | "/" | ClassSetReservedPunctuator ?
			[escaped, postEscaped]
		:	[ErrorMessage<writeUnnecessaryEscapeMessage<escaped>>, ""]
	: mode extends "u" ?
		escaped extends Control | "/" ?
			[escaped, postEscaped]
		:	[ErrorMessage<writeUnnecessaryEscapeMessage<escaped>>, ""]
	:	[escaped, postEscaped]

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

export const invalidClassRangeMessage =
	"Character class escape cannot be used as a range endpoint with the 'u' or 'v' flag"

export type invalidClassRangeMessage = typeof invalidClassRangeMessage

export const invalidDecimalEscapeMessage =
	"Decimal escapes other than '\\0' are not allowed with the 'u' or 'v' flag"

export type invalidDecimalEscapeMessage =
	"Decimal escapes other than '\0' are not allowed with the 'u' or 'v' flag"

export const invalidHexEscapeMessage =
	"Invalid hexadecimal escape in character class"

export type invalidHexEscapeMessage = typeof invalidHexEscapeMessage

export const invalidUnicodeEscapeMessage =
	"Invalid Unicode escape in character class"

export type invalidUnicodeEscapeMessage = typeof invalidUnicodeEscapeMessage

export const invalidControlEscapeMessage =
	"Invalid control escape in character class"

export type invalidControlEscapeMessage = typeof invalidControlEscapeMessage

export const invalidClassStringDisjunctionMessage =
	"\\\\q must be followed by {...} in character class with the 'v' flag"

export type invalidClassStringDisjunctionMessage =
	"\\q must be followed by {...} in character class with the 'v' flag"

export const loneClosingBracketMessage =
	"Lone character class bracket: escape ']' with '\\\\]' to match literally with the 'u' or 'v' flag"

export type loneClosingBracketMessage =
	"Lone character class bracket: escape ']' with '\\]' to match literally with the 'u' or 'v' flag"

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
