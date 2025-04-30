import type {
	ErrorMessage,
	Scanner,
	WhitespaceChar
} from "@ark/util"
import type { Control, s, State } from "./state.ts"

export type parseEscape<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer char, infer nextUnscanned> ?
		char extends `${bigint}` ?
			unscanned extends (
				`${infer index extends keyof s["captures"] & number}${infer postBackreference}`
			) ?
				s.shiftQuantifiable<
					s,
					s["captures"][index] extends string[] ? s["captures"][index]
					:	// if the group is still being parsed, JS treats it as an empty string
						[""],
					postBackreference
				>
			:	s.error<`Group ${char} does not exist`>
		: char extends "k" ?
			nextUnscanned extends `<${infer name}>${infer following}` ?
				name extends keyof s["captures"] ?
					s.shiftQuantifiable<
						s,
						s["captures"][name] extends string[] ? s["captures"][name]
						:	// if the group is still being parsed, JS treats it as an empty string
							[""],
						following
					>
				:	//  must be to ${stringifyUnion<Extract<keyof s["captures"], string>>}
					s.error<`\\named reference does not exist`>
			:	s.error<"\\k must be followed by a named reference like <name>">
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
