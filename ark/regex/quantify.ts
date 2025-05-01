import type { conform, Scanner } from "@ark/util"
import type { s, State } from "./state.ts"

export type NonEmptyQuantifiable = [string, ...string[]]

export type parseBuiltinQuantifier<
	s extends State,
	quantifier extends QuantifyingChar,
	unscanned extends string
> =
	s["quantifiable"] extends NonEmptyQuantifiable ?
		s.pushQuantified<
			s,
			quantifyBuiltin<quantifier, s["quantifiable"]>,
			unscanned extends Scanner.shift<"?", infer lazyUnscanned> ? lazyUnscanned
			:	unscanned
		>
	:	s.error<writeUnmatchedQuantifierError<quantifier>>

type ParsedRange = {
	min: number
	max: number | null
	unscanned: string
}

declare namespace ParsedRange {
	export type from<r extends ParsedRange> = r
}

type skipPossibleQuestionMark<unscanned extends string> =
	unscanned extends `?${infer next}` ? next : unscanned

type parsePossibleRangeString<unscanned extends string> =
	unscanned extends (
		`${infer l extends number},${infer r extends number}}${infer next}`
	) ?
		ParsedRange.from<{
			min: l
			max: r
			unscanned: skipPossibleQuestionMark<next>
		}>
	: unscanned extends `${infer l extends number},}${infer next}` ?
		ParsedRange.from<{
			min: l
			max: null
			unscanned: skipPossibleQuestionMark<next>
		}>
	: unscanned extends `${infer l extends number}}${infer next}` ?
		ParsedRange.from<{
			min: l
			max: l
			unscanned: skipPossibleQuestionMark<next>
		}>
	:	null

export type parsePossibleRange<
	s extends State,
	unscanned extends string,
	parsed extends ParsedRange | null = parsePossibleRangeString<unscanned>
> =
	parsed extends ParsedRange ?
		s["quantifiable"] extends NonEmptyQuantifiable ?
			applyQuantified<
				s,
				quantify<s["quantifiable"], parsed["min"], parsed["max"]>,
				parsed["unscanned"]
			>
		:	s.error<
				writeUnmatchedQuantifierError<
					unscanned extends `${infer range}${parsed["unscanned"]}` ? `{${range}`
					:	never
				>
			>
	:	s.shiftQuantifiable<s, ["{"], unscanned>

type applyQuantified<
	s extends State,
	quantified,
	unscanned extends string
> = s.pushQuantified<
	s,
	// TS flops trying to check this as a constraint, so just conform it here
	conform<quantified, string[]>,
	unscanned extends Scanner.shift<"?", infer lazyUnscanned> ? lazyUnscanned
	:	unscanned
>

type quantifyBuiltin<
	quantifier extends QuantifyingChar,
	token extends NonEmptyQuantifiable
> =
	quantifier extends "?" ? [...token, ""]
	: quantifier extends "+" ? suffix<token, string>
	: quantifier extends "*" ? ["", ...suffix<token, string>]
	: never

type quantify<
	token extends NonEmptyQuantifiable,
	min extends number,
	max extends number | null
> = _loopUntilMin<token, min, max, [], { [i in keyof token]: "" }>

type _loopUntilMin<
	token extends NonEmptyQuantifiable,
	min extends number,
	max extends number | null,
	i extends 1[],
	repetitions extends string[]
> =
	i["length"] extends min ?
		max extends number ?
			_loopUntilMax<token, min, max, i, repetitions>
		:	suffix<repetitions, string>
	:	_loopUntilMin<
			token,
			min,
			max,
			[...i, 1],
			{
				[i in keyof token]: `${repetitions[i & keyof repetitions]}${token[i]}`
			}
		>

type _loopUntilMax<
	quantifiable extends NonEmptyQuantifiable,
	min extends number,
	max extends number,
	i extends 1[],
	repetitions extends string[]
> =
	i["length"] extends max ? repetitions
	:	[
			...repetitions,
			..._loopUntilMax<
				quantifiable,
				min,
				max,
				[...i, 1],
				{
					[i in keyof quantifiable]: `${repetitions[i & keyof repetitions]}${quantifiable[i]}`
				}
			>
		]

export type QuantifyingChar = "*" | "+" | "?"

export const writeUnmatchedQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeUnmatchedQuantifierError<quantifier> =>
	`Quantifier ${quantifier} requires a preceding token`

export type writeUnmatchedQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} requires a preceding token`

type suffix<token extends string[], suffix extends string> = [
	...token,
	...{ [i in keyof token]: `${token[i]}${suffix}` }
]
