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
			ShiftedModifiers<infer flags, infer negated, infer following>
		) ?
			following extends ErrorMessage<infer message> ?
				s.error<message>
			:	s.pushGroup<
					s,
					never,
					following,
					false,
					"i" extends flags ? true
					: "i" extends negated ? false
					: undefined
				>
		:	never
	:	s.error<writeUnclosedGroupMessage<")">>

type ShiftedModifiers<
	flags extends ModifiableFlag = ModifiableFlag,
	negated extends ModifiableFlag = ModifiableFlag,
	unscanned extends string = string
> = [ParsedModifiers<flags, negated>, unscanned]

type ParsedModifiers<
	flags extends ModifiableFlag = ModifiableFlag,
	negated extends ModifiableFlag = ModifiableFlag
> = {
	flags: flags
	negated: negated
}

type shiftModifiers<unscanned extends string> =
	Scanner.shiftUntil<unscanned, ":" | ")"> extends (
		Scanner.shiftResult<infer scanned, infer next>
	) ?
		next extends Scanner.shift<infer terminator, infer following> ?
			terminator extends ":" ?
				parseModifiers<scanned> extends (
					ParsedModifiers<infer flags, infer negated>
				) ?
					ShiftedModifiers<flags, negated, following>
				:	// set unscanned to the error string
					ShiftedModifiers<
						never,
						never,
						ErrorMessage<parseModifiers<scanned> & string>
					>
			:	ShiftedModifiers<
					never,
					never,
					ErrorMessage<unescapedLiteralQuestionMarkMessage>
				>
		:	ShiftedModifiers<
				never,
				never,
				ErrorMessage<writeUnclosedGroupMessage<")">>
			>
	:	never

type parseModifiers<unscanned extends string> = _parseModifiers<
	unscanned,
	never,
	never
>

type _parseModifiers<
	unscanned extends string,
	flags extends ModifiableFlag,
	negated extends ModifiableFlag
> =
	unscanned extends Scanner.shift<infer lookahead, infer next> ?
		lookahead extends "-" ?
			[negated] extends [never] ?
				next extends Scanner.shift<infer modifier, infer next> ?
					modifier extends ModifiableFlag ?
						modifier extends flags | negated ?
							writeDuplicateModifierMessage<modifier>
						:	_parseModifiers<next, flags, negated | modifier>
					:	writeInvalidModifierMessage<modifier>
				:	missingNegatedModifierMessage
			:	multipleModifierDashesMessage
		: lookahead extends ModifiableFlag ?
			lookahead extends flags | negated ?
				writeDuplicateModifierMessage<lookahead>
			: // once "-" has been seen, all subsequent modifiers are negated
			// check if we've already parsed a negation to see how to treat this
			[negated] extends [never] ?
				_parseModifiers<next, flags | lookahead, negated>
			:	_parseModifiers<next, flags, negated | lookahead>
		:	writeInvalidModifierMessage<lookahead>
	:	ParsedModifiers<flags, negated>

export const writeDuplicateModifierMessage = <modifier extends ModifiableFlag>(
	modifier: modifier
): writeDuplicateModifierMessage<modifier> =>
	`modifier ${modifier} cannot appear multiple times in a single group`

type writeDuplicateModifierMessage<modifier extends ModifiableFlag> =
	`modifier ${modifier} cannot appear multiple times in a single group`

export const multipleModifierDashesMessage =
	"modifiers can include at most one '-' to negate subsequent flags"

type multipleModifierDashesMessage = typeof multipleModifierDashesMessage

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
