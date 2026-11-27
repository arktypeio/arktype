import type {
	contains,
	ErrorMessage,
	parseNonNegativeInteger,
	Scanner
} from "@ark/util"
import type { UnicodeFlag } from "./regex.ts"
import type { Control, ReferenceNode, s, State } from "./state.ts"

export type parseEscape<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer char, infer nextUnscanned> ?
		char extends NonZeroDigit ? parseNumericBackreference<s, unscanned>
		: char extends "k" ? parseNamedBackreference<s, nextUnscanned>
		: char extends UnicodePropertyChar ?
			contains<s["flags"], UnicodeFlag> extends true ?
				parseUnicodeProperty<s, char, nextUnscanned>
			: nextUnscanned extends `{${infer body}}${string}` ?
				isQuantifierBody<body> extends true ?
					parseSingleEscapedCharacter<s, char, nextUnscanned>
				:	s.error<writeUnicodePropertyRequiresFlagMessage<char>>
			:	parseSingleEscapedCharacter<s, char, nextUnscanned>
		:	parseSingleEscapedCharacter<s, char, nextUnscanned>
	:	s.error<trailingBackslashMessage>

type isQuantifierBody<body extends string> =
	body extends `${infer l extends `${number}`},${infer r extends `${number}`}` ?
		[parseNonNegativeInteger<l>, parseNonNegativeInteger<r>] extends (
			[never, unknown] | [unknown, never]
		) ?
			false
		:	true
	: body extends `${infer l extends `${number}`},` ?
		[parseNonNegativeInteger<l>] extends [never] ?
			false
		:	true
	: body extends `${infer l extends `${number}`}` ?
		[parseNonNegativeInteger<l>] extends [never] ?
			false
		:	true
	:	false

type parseNumericBackreference<
	s extends State,
	// expects everything following the backslash, including the first digit
	fullUnscanned extends string
> =
	Scanner.shiftUntilNot<fullUnscanned, StringDigit> extends (
		Scanner.shiftResult<infer ref, infer remaining>
	) ?
		s.shiftQuantifiable<
			s,
			ReferenceNode<ref, s["caseInsensitive"] extends false ? false : true>,
			remaining
		>
	:	never

type parseNamedBackreference<s extends State, unscanned extends string> =
	unscanned extends `<${infer ref}>${infer following}` ?
		s.shiftQuantifiable<
			s,
			ReferenceNode<ref, s["caseInsensitive"] extends false ? false : true>,
			following
		>
	:	s.error<missingBackreferenceNameMessage>

type parseUnicodeProperty<
	s extends State,
	char extends UnicodePropertyChar,
	unscanned extends string
> =
	unscanned extends `{${infer prop}}${infer following}` ?
		prop extends "" ?
			s.error<writeInvalidUnicodePropertyMessage<char>>
		:	s.shiftQuantifiable<s, string, following>
	:	s.error<writeInvalidUnicodePropertyMessage<char>>

type parseSingleEscapedCharacter<
	s extends State,
	char extends string,
	remaining extends string
> =
	parseEscapedChar<char> extends infer result extends string ?
		result extends ErrorMessage ?
			s.error<result>
		:	s.shiftQuantifiable<s, result, remaining>
	:	never

export type parseEscapedChar<char extends string> =
	// \s matches \r, \f, \v and Unicode spaces, too many to infer as a union
	char extends RegexClassChar | "s" ? string
	: char extends "d" ? `${number}`
	: // does not consume tokens
	char extends BoundaryChar ? ""
	: char extends Control ? char
	: char extends "c" ? ErrorMessage<caretNotationMessage>
	: char extends StringEscapableChar ?
		ErrorMessage<writeStringEscapableMessage<char>>
	:	ErrorMessage<writeUnnecessaryEscapeMessage<char>>

export const trailingBackslashMessage = "A regex cannot end with \\"

export type trailingBackslashMessage = typeof trailingBackslashMessage

export const writeUnresolvableBackreferenceMessage = <
	ref extends string | number
>(
	ref: ref
): writeUnresolvableBackreferenceMessage<ref> => `Group ${ref} does not exist`

export type writeUnresolvableBackreferenceMessage<ref extends string | number> =
	`Group ${ref} does not exist`

export const missingBackreferenceNameMessage =
	"\\k must be followed by a named reference like <name>"

export type missingBackreferenceNameMessage =
	typeof missingBackreferenceNameMessage

export const writeInvalidUnicodePropertyMessage = <
	char extends UnicodePropertyChar
>(
	char: char
): string =>
	`\\\\${char} must be followed by a property like \\\\${char}{Emoji_Presentation}`

export type writeInvalidUnicodePropertyMessage<
	char extends UnicodePropertyChar
> =
	`\\${char} must be followed by a property like \\${char}{Emoji_Presentation}`

export const writeUnicodePropertyRequiresFlagMessage = <
	char extends UnicodePropertyChar
>(
	char: char
): string => `\\\\${char}{...} requires the 'u' or 'v' flag`

export type writeUnicodePropertyRequiresFlagMessage<
	char extends UnicodePropertyChar
> = `\\${char}{...} requires the 'u' or 'v' flag`

export const writeUnnecessaryEscapeMessage = <char extends string>(
	char: char
): writeUnnecessaryEscapeMessage<char> =>
	`Escape preceding ${char} is unnecessary and should be removed.`

export type writeUnnecessaryEscapeMessage<char extends string> =
	`Escape preceding ${char} is unnecessary and should be removed.`

// we have to add extra backslashes to the runtime variants of these
// so that attest can compare them correctly to their type-level equivalents
// the runtime variants are only used for the tests

export const writeStringEscapableMessage = (char: StringEscapableChar) =>
	`\\${char} should be specified with a single backslash like regex('\\n')` as const

export type writeStringEscapableMessage<char extends StringEscapableChar> =
	`\\${char} should be specified with a single backslash like regex('\n')`

export const caretNotationMessage =
	"\\\\cX notation is not supported. Use hex (\\\\x) or unicode (\\\\u) instead."

export type caretNotationMessage =
	"\\cX notation is not supported. Use hex (\\x) or unicode (\\u) instead."

export type StringEscapableChar = "t" | "n" | "r" | "f" | "v" | "0" | "x" | "u"

export type RegexClassChar = "w" | "W" | "D" | "S"

export type BoundaryChar = "b" | "B"

export type UnicodePropertyChar = "p" | "P"

export type NonZeroDigit = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

export type StringDigit = "0" | NonZeroDigit

export type HexDigit =
	| StringDigit
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"

export type isAsciiDigits<s extends string> =
	s extends StringDigit ? true
	: s extends `${infer head}${infer tail}` ?
		head extends StringDigit ?
			isAsciiDigits<tail>
		:	false
	:	false

export type isHexDigits<s extends string> =
	s extends `${HexDigit}${infer rest}` ?
		rest extends "" ?
			true
		:	isHexDigits<rest>
	:	false

export type shiftTwoHexDigits<s extends string> =
	s extends `${infer h1}${infer h2}${infer rest}` ?
		h1 extends HexDigit ?
			h2 extends HexDigit ?
				rest
			:	null
		:	null
	:	null

export type shiftFourHexDigits<s extends string> =
	s extends `${infer h1}${infer h2}${infer h3}${infer h4}${infer rest}` ?
		h1 extends HexDigit ?
			h2 extends HexDigit ?
				h3 extends HexDigit ?
					h4 extends HexDigit ?
						rest
					:	null
				:	null
			:	null
		:	null
	:	null
