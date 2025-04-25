import type { Backslash, ErrorMessage, Scanner } from "@ark/util"
import type { parseEscape } from "./escape.ts"
import type {
	BuiltinQuantifier,
	NonEmptyQuantifiable,
	quantifyBuiltin,
	writeUnmatchedQuantifierError
} from "./quantify.ts"
import type { Anchor, s, State } from "./state.ts"

export type parse<s extends State> =
	s["unscanned"] extends "" | ErrorMessage ? s
	: s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "." ? parse<s.shiftQuantifiable<s, [string], unscanned>>
		: lookahead extends Backslash ? parseEscape<s, unscanned>
		: lookahead extends "|" ? parse<s.finalizeBranch<s, unscanned>>
		: lookahead extends Anchor ? parse<s.anchor<s, lookahead, unscanned>>
		: lookahead extends "(" ? parse<s.pushGroup<s, unscanned>>
		: lookahead extends ")" ? parse<s.popGroup<s, unscanned>>
		: lookahead extends BuiltinQuantifier ?
			s["quantifiable"] extends NonEmptyQuantifiable ?
				parse<
					s.pushQuantified<
						s,
						quantifyBuiltin<lookahead, s["quantifiable"]>,
						unscanned
					>
				>
			:	s.error<writeUnmatchedQuantifierError<lookahead>>
		:	parse<s.shiftQuantifiable<s, [lookahead], unscanned>>
	:	s
