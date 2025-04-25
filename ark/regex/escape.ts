import type { ErrorMessage, Scanner, WhitespaceChar } from "@ark/util"
import type { Control, State, s } from "./state.ts"

export type parseEscape<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer char, infer nextUnscanned> ?
		char extends `${bigint}` ?
			s.shiftQuantifiable<
				s,
				[string],
				nextUnscanned extends `${bigint}${infer following}` ? following
				:	nextUnscanned
			>
		: char extends "k" ?
			s.shiftQuantifiable<
				s,
				[string],
				nextUnscanned extends `<${string}>${infer following}` ? following
				:	ErrorMessage<"\\k must be followed by a named reference like <name>">
			>
		: parseEscapedChar<char> extends infer result extends string ?
			result extends ErrorMessage ?
				s.error<result>
			:	s.shiftQuantifiable<s, [result], nextUnscanned>
		:	never
	:	s.error<`A regex cannot end with \\`>

export type parseEscapedChar<char extends string> =
	char extends StringClassChar ? string
	: char extends "d" ? `${bigint}`
	: char extends "s" ? WhitespaceChar
	: char extends Control ? char
	: ErrorMessage<`Escape preceding ${char} is unnecessary and should be removed.`>

export type StringClassChar = "w" | "W" | "D" | "S"
