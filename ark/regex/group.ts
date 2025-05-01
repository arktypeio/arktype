import type {
	ErrorMessage,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { State, s } from "./state.ts"

type LookaroundChar = "=" | "!"

export type ModifiableFlag = "i" | "m" | "s"

export type parseGroup<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends "?" ?
			parseNonCapturingGroup<s, next>
		:	s.pushGroup<
				s,
				nextCaptureIndex<s["captures"]>,
				unscanned,
				false,
				undefined
			>
	:	s.error<writeUnclosedGroupMessage<")">>

type parseNonCapturingGroup<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends ":" ? s.pushGroup<s, never, next, false, undefined>
		: // for now, lookarounds don't affect inference
		lookahead extends LookaroundChar ?
			s.pushGroup<s, never, next, true, undefined>
		: lookahead extends "<" ? parseNamedGroupOrLookbehind<s, next>
		: shiftModifiers<unscanned> extends (
			ModifierShiftResult<infer result, infer following>
		) ?
			result extends boolean | undefined ?
				s.pushGroup<s, never, following, false, result>
			:	s.error<result & string>
		:	never
	:	s.error<writeUnclosedGroupMessage<")">>

type ModifierShiftResult<
	result extends string | boolean | undefined = string | boolean | undefined,
	unscanned extends string = string
> = [result: result, unscanned: unscanned]

type shiftModifiers<unscanned extends string> =
	Scanner.shiftUntil<unscanned, ":" | ")"> extends (
		Scanner.shiftResult<infer scanned, infer next>
	) ?
		next extends Scanner.shift<infer terminator, infer following> ?
			terminator extends ":" ?
				ModifierShiftResult<parseModifiers<scanned>, following>
			:	ModifierShiftResult<unescapedLiteralQuestionMarkMessage, "">
		:	ModifierShiftResult<writeUnclosedGroupMessage<")">, "">
	:	never

type parseModifiers<flags extends string> =
	flags extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "-" ?
			unscanned extends Scanner.shift<infer modifier, infer next> ?
				parseModifierChar<modifier, false> extends (
					infer modifierParseResult extends string | boolean
				) ?
					modifierParseResult
				:	parseModifiers<next>
			:	missingNegatedModifierMessage
		: parseModifierChar<lookahead, true> extends (
			infer modifierParseResult extends string | boolean
		) ?
			modifierParseResult
		:	parseModifiers<unscanned>
	:	undefined

type parseModifierChar<char extends string, positive extends boolean> =
	char extends "i" ? positive
	: char extends "m" | "s" ? undefined
	: writeInvalidModifierMessage<char>

export const missingNegatedModifierMessage = `- must be followed by the modifier flag to negate ('i', 'm' or 's')`

type missingNegatedModifierMessage = typeof missingNegatedModifierMessage

export const writeInvalidModifierMessage = <char extends string>(
	char: char
): writeInvalidModifierMessage<char> =>
	`Modifier flag ${char} must be 'i', 'm' or 's'`

type writeInvalidModifierMessage<char extends string> =
	`Modifier flag ${char} must be 'i', 'm' or 's'`

type parseNamedGroupOrLookbehind<s extends State, unscanned extends string> =
	unscanned extends Scanner.shift<LookaroundChar, infer next> ?
		// for now, lookarounds don't affect inference
		s.pushGroup<s, never, next, true, undefined>
	: shiftNamedGroup<unscanned> extends (
		Scanner.shiftResult<infer name, infer following>
	) ?
		s.pushGroup<
			s,
			name | nextCaptureIndex<s["captures"]>,
			following,
			false,
			undefined
		>
	:	s.error<writeUnclosedGroupMessage<")">>

type shiftNamedGroup<unscanned extends string> =
	unscanned extends `${infer name}>${infer next}` ?
		name extends "" ?
			Scanner.shiftResult<"", ErrorMessage<unnamedCaptureGroupMessage>>
		:	Scanner.shiftResult<name, next>
	:	Scanner.shiftResult<"", ErrorMessage<writeUnclosedGroupMessage<">">>>

// first capture group is 1
type nextCaptureIndex<captures, counter extends 1[] = [1]> =
	counter["length"] extends keyof captures ?
		nextCaptureIndex<captures, [...counter, 1]>
	:	counter["length"]

export const unnamedCaptureGroupMessage = "Capture group <> requires a name"

export type unnamedCaptureGroupMessage = typeof unnamedCaptureGroupMessage

export const unescapedLiteralQuestionMarkMessage =
	"literal ? must be escaped at the start of a group"

export type unescapedLiteralQuestionMarkMessage =
	typeof unescapedLiteralQuestionMarkMessage
