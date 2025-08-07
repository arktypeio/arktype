import type { ErrorMessage, Scanner, WhitespaceChar } from "@ark/util"
import type { Control, ReferenceNode, RegexAst, s, State } from "./state.ts"

export type parseEscape<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer char, infer nextUnscanned> ?
		char extends NonZeroDigit ? parseNumericBackreference<s, unscanned>
		: char extends "k" ? parseNamedBackreference<s, nextUnscanned>
		: char extends UnicodePropertyChar ?
			parseUnicodeProperty<s, char, nextUnscanned>
		:	parseSingleEscapedCharacter<s, char, nextUnscanned>
	:	s.error<trailingBackslashMessage>

type parseNumericBackreference<
	s extends State,
	// expects everything following the backslash, including the first digit
	fullUnscanned extends string
> =
	Scanner.shiftUntilNot<fullUnscanned, StringDigit> extends (
		Scanner.shiftResult<infer ref, infer remaining>
	) ?
		s.shiftQuantifiable<s, ReferenceNode<ref>, remaining>
	:	never

//  fullUnscanned extends `${infer ref extends bigint}${string}` ?
// 		s.error<writeUnresolvableBackreferenceMessage<`${ref}`>>
// 	:	never

type parseNamedBackreference<s extends State, unscanned extends string> =
	unscanned extends `<${infer ref}>${infer following}` ?
		s.shiftQuantifiable<s, ReferenceNode<ref>, following>
	:	s.error<missingBackreferenceNameMessage>

// ref extends keyof s["captures"] ?
// 			s.shiftQuantifiable<s, getCapturedSequence<s["captures"], ref>, following>
// 		:	s.error<writeUnresolvableBackreferenceMessage<ref>>

// if the group is still being parsed, JS treats it as an empty string
type getCapturedSequence<captures, ref extends keyof captures> =
	captures[ref] extends RegexAst ? captures[ref] : ""

type parseUnicodeProperty<
	s extends State,
	char extends UnicodePropertyChar,
	unscanned extends string
> =
	unscanned extends `{${string}}${infer following}` ?
		s.shiftQuantifiable<s, string, following>
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
	char extends RegexClassChar ? string
	: char extends "d" ? `${bigint}`
	: char extends "s" ? WhitespaceChar
	: // does not consume tokens
	char extends BoundaryChar ? ""
	: char extends Control ? char
	: char extends "c" ? ErrorMessage<caretNotationMessage>
	: char extends StringEscapableChar ?
		ErrorMessage<writeStringEscapableMessage<char>>
	:	ErrorMessage<writeUnnecessaryEscapeMessage<char>>

export const trailingBackslashMessage = "A regex cannot end with \\"

export type trailingBackslashMessage = typeof trailingBackslashMessage

export const writeUnresolvableBackreferenceMessage = <ref extends string>(
	ref: ref
): writeUnresolvableBackreferenceMessage<ref> => `Group ${ref} does not exist`

export type writeUnresolvableBackreferenceMessage<ref extends string> =
	`Group ${ref} does not exist`

export const missingBackreferenceNameMessage =
	"\\k must be followed by a named reference like <name>"

export type missingBackreferenceNameMessage =
	typeof missingBackreferenceNameMessage

export const writeInvalidUnicodePropertyMessage = <
	char extends UnicodePropertyChar
>(
	char: char
): writeInvalidUnicodePropertyMessage<char> =>
	`\\${char} must be followed by a property like \\${char}{Emoji_Presentation}`

export type writeInvalidUnicodePropertyMessage<
	char extends UnicodePropertyChar
> =
	`\\${char} must be followed by a property like \\${char}{Emoji_Presentation}`

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
