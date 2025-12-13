import type { parseNonNegativeInteger, Scanner } from "@ark/util"
import type { s, State } from "./state.ts"

export type parseBuiltinQuantifier<
	s extends State,
	quantifier extends QuantifyingChar,
	unscanned extends string
> =
	s["root"] extends "" ? s.error<writeUnmatchedQuantifierError<quantifier>>
	:	quantifyBuiltin<
			s,
			quantifier,
			unscanned extends Scanner.shift<"?", infer lazyUnscanned> ? lazyUnscanned
			:	unscanned
		>

type quantifyBuiltin<
	s extends State,
	quantifier extends QuantifyingChar,
	unscanned extends string
> =
	quantifier extends "?" ? s.pushQuantifier<s, 0, 1, unscanned>
	: quantifier extends "+" ? s.pushQuantifier<s, 1, null, unscanned>
	: quantifier extends "*" ? s.pushQuantifier<s, 0, null, unscanned>
	: never

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
		`${infer l extends `${number}`},${infer r extends `${number}`}}${infer next}`
	) ?
		ParsedRange.from<{
			min: parseNonNegativeInteger<l>
			max: parseNonNegativeInteger<r>
			unscanned: skipPossibleQuestionMark<next>
		}>
	: unscanned extends `${infer l extends `${number}`},}${infer next}` ?
		ParsedRange.from<{
			min: parseNonNegativeInteger<l>
			max: null
			unscanned: skipPossibleQuestionMark<next>
		}>
	: unscanned extends `${infer l extends `${number}`}}${infer next}` ?
		ParsedRange.from<{
			min: parseNonNegativeInteger<l>
			max: parseNonNegativeInteger<l>
			unscanned: skipPossibleQuestionMark<next>
		}>
	:	null

type parseQuantifier<unscanned extends string, parsed extends ParsedRange> =
	unscanned extends `${infer range}${parsed["unscanned"]}` ? `{${range}` : never
export type parsePossibleRange<
	s extends State,
	unscanned extends string,
	parsed extends ParsedRange | null = parsePossibleRangeString<unscanned>
> =
	parsed extends ParsedRange ?
		s["root"] extends "" ?
			s.error<writeUnmatchedQuantifierError<parseQuantifier<unscanned, parsed>>>
		: [parsed["min"], parsed["max"]] extends (
			[never, unknown] | [unknown, never]
		) ?
			s.error<
				writeUnnaturalNumberQuantifierError<parseQuantifier<unscanned, parsed>>
			>
		:	s.pushQuantifier<
				s,
				parsed["min"],
				parsed["max"],
				parsed["unscanned"] extends Scanner.shift<"?", infer lazyUnscanned> ?
					lazyUnscanned
				:	parsed["unscanned"]
			>
	:	s.shiftQuantifiable<s, "{", unscanned>

export type quantify<
	pattern extends string,
	min extends number,
	max extends number | null
> = tryFastPath<pattern, min, max>

type tryFastPath<
	pattern extends string,
	min extends number,
	max extends number | null
> =
	max extends 0 ? ""
	: // repeating string or `${number}` any number of times will not change the type
	string extends pattern ? string
	: `${number}` extends pattern ? `${number}`
	: min extends 0 ?
		max extends 1 ? "" | pattern
		: max extends number ? loopFromZero<pattern, max, "", []>
		: // max is null, all we can do is append ${string}
			"" | `${pattern}${string}`
	:	loopUntilMin<pattern, min, max, "", []>

type loopFromZero<
	base extends string,
	max extends number,
	acc extends string,
	repetitions extends 1[]
> =
	repetitions["length"] extends max ? acc
	:	loopFromZero<base, max, acc | `${acc}${base}`, [...repetitions, 1]>

type loopUntilMin<
	base extends string,
	min extends number,
	max extends number | null,
	acc extends string,
	repetitions extends 1[]
> =
	repetitions["length"] extends min ?
		max extends number ? loopUntilMax<base, min, max, acc, repetitions>
		: // don't need appendNonRedundant for these cases because if the pattern is
		// something collapsible like `string` or `bigint, the fast path has
		// already been taken
		repetitions["length"] extends 0 ? acc | `${acc}${base}${string}`
		: `${acc}${string}`
	:	loopUntilMin<base, min, max, `${acc}${base}`, [...repetitions, 1]>

type loopUntilMax<
	base extends string,
	min extends number,
	max extends number,
	acc extends string,
	repetitions extends 1[]
> =
	repetitions["length"] extends max ? acc
	:	loopUntilMax<base, min, max, acc | `${acc}${base}`, [...repetitions, 1]>

export type QuantifyingChar = "*" | "+" | "?"

export const writeUnmatchedQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeUnmatchedQuantifierError<quantifier> =>
	`Quantifier ${quantifier} requires a preceding token`

export type writeUnmatchedQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} requires a preceding token`

export const writeUnnaturalNumberQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeUnnaturalNumberQuantifierError<quantifier> =>
	`Quantifier ${quantifier} must use natural numbers`

export type writeUnnaturalNumberQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} must use natural numbers`
