import type {
	ErrorMessage,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { State, s } from "./state.ts"

type LookaroundChar = "=" | "!"

export type parseGroup<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends "?" ?
			parseNonCapturingGroup<s, next>
		:	s.pushGroup<s, nextCaptureIndex<s["captures"]>, unscanned, false>
	:	s.error<writeUnclosedGroupMessage<")">>

type parseNonCapturingGroup<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends ":" ? s.pushGroup<s, never, next, false>
		: // for now, lookarounds don't affect inference
		lookahead extends LookaroundChar ? s.pushGroup<s, never, next, true>
		: lookahead extends "<" ? parseNamedGroupOrLookbehind<s, next>
		: s.error<unescapedLiteralQuestionMarkMessage>
	:	s.error<writeUnclosedGroupMessage<")">>

type parseNamedGroupOrLookbehind<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<LookaroundChar, infer next> ?
		// for now, lookarounds don't affect inference
		s.pushGroup<s, never, next, true>
	: shiftNamedGroup<unscanned> extends (
		Scanner.shiftResult<infer name, infer following>
	) ?
		s.pushGroup<s, name | nextCaptureIndex<s["captures"]>, following, false>
	:	s.error<writeUnclosedGroupMessage<")">>

type shiftNamedGroup<unscanned extends string> =
	unscanned extends `${infer name}>${infer next}` ?
		name extends "" ?
			Scanner.shiftResult<"", ErrorMessage<"Capture group <> requires a name">>
		:	Scanner.shiftResult<name, next>
	:	Scanner.shiftResult<"", ErrorMessage<writeUnclosedGroupMessage<">">>>

// first capture group is 1
type nextCaptureIndex<captures, counter extends 1[] = [1]> =
	counter["length"] extends keyof captures ?
		nextCaptureIndex<captures, [...counter, 1]>
	:	counter["length"]

export const unescapedLiteralQuestionMarkMessage =
	"literal ? must be escaped at the start of a group"

export type unescapedLiteralQuestionMarkMessage =
	typeof unescapedLiteralQuestionMarkMessage
