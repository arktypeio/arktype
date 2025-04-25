import type { ErrorMessage, Scanner, WhitespaceChar } from "@ark/util"
import type { parse } from "./parse.ts"
import type { Control, State, s } from "./state.ts"

export type parseEscape<
	s extends State,
	unscanned extends string,
	parsed extends ParsedEscapeSequence = parseEscapedChar<unscanned>
> =
	parsed["result"] extends ErrorMessage ? parsed["result"]
	:	parse<s.shiftQuantifiable<s, [parsed["result"]], parsed["unscanned"]>>

type parseEscapedChar<source extends string> =
	source extends Scanner.shift<infer lookahead, infer unscanned> ?
		ParsedEscapeSequence<
			lookahead extends StringClassChar ? string
			: lookahead extends "d" ? `${bigint}`
			: lookahead extends "s" ? WhitespaceChar
			: lookahead extends Control ? lookahead
			: ErrorMessage<`Escape preceding ${lookahead} is unnecessary and should be removed.`>,
			unscanned
		>
	:	ParsedEscapeSequence<ErrorMessage<`A regex cannot end with \\`>, "">

type ParsedEscapeSequence<
	result extends string = string,
	unscanned extends string = string
> = {
	result: result
	unscanned: unscanned
}

export type StringClassChar = "w" | "W" | "D" | "S"
