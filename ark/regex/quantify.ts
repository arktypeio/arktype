import type { contains, parseNonNegativeInteger, Scanner } from "@ark/util"
import type { UnicodeFlag } from "./regex.ts"
import type { appendString, s, State } from "./state.ts"

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

type GreaterDigits = {
	"0": never
	"1": "0"
	"2": "0" | "1"
	"3": "0" | "1" | "2"
	"4": "0" | "1" | "2" | "3"
	"5": "0" | "1" | "2" | "3" | "4"
	"6": "0" | "1" | "2" | "3" | "4" | "5"
	"7": "0" | "1" | "2" | "3" | "4" | "5" | "6"
	"8": "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7"
	"9": "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
}

type isGreaterNaturalString<
	l extends string,
	r extends string,
	decided extends boolean | null = null
> =
	l extends `${infer ld extends keyof GreaterDigits}${infer lRest}` ?
		r extends `${infer rd extends keyof GreaterDigits}${infer rRest}` ?
			isGreaterNaturalString<
				lRest,
				rRest,
				decided extends boolean ? decided
				: ld extends rd ? null
				: rd extends GreaterDigits[ld] ? true
				: false
			>
		:	true
	: r extends "" ?
		decided extends true ?
			true
		:	false
	:	false

type exceedsMax<min extends number, max extends number | null> =
	max extends number ?
		min extends 0 | max ?
			false
		:	isGreaterNaturalString<`${min}`, `${max}`>
	:	false

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
		: exceedsMax<parsed["min"], parsed["max"]> extends true ?
			s.error<
				writeMinExceedsMaxQuantifierError<parseQuantifier<unscanned, parsed>>
			>
		:	s.pushQuantifier<s, parsed["min"], parsed["max"], parsed["unscanned"]>
	: contains<s["flags"], UnicodeFlag> extends true ?
		s.error<incompleteQuantifierMessage>
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
	: // repeating string any number of times will not change the type
	string extends pattern ? string
	: [pattern, `${number}`] extends [`${number}`, pattern] ?
		// an unbounded run of digits can overflow to Infinity, which isn't a
		// `${number}`. A bounded one keeps the type, but zero repetitions
		// produce "", which `${number}` does not include
		max extends null ? string
		: min extends 0 ? "" | `${number}`
		: `${number}`
	: min extends 0 ?
		max extends 1 ? "" | pattern
		: max extends number ? loopFromZero<pattern, max, "", []>
		: // max is null, all we can do is append ${string}
			"" | appendString<pattern>
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
		repetitions["length"] extends 0 ? acc | appendString<`${acc}${base}`>
		: appendString<acc>
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

export const writeMinExceedsMaxQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeMinExceedsMaxQuantifierError<quantifier> =>
	`Quantifier ${quantifier} min cannot exceed max`

export type writeMinExceedsMaxQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} min cannot exceed max`

export const incompleteQuantifierMessage =
	"Incomplete quantifier: escape '{' with '\\\\{' to match literally with the 'u' or 'v' flag"

export type incompleteQuantifierMessage =
	"Incomplete quantifier: escape '{' with '\\{' to match literally with the 'u' or 'v' flag"

export const loneClosingBraceMessage =
	"Lone quantifier bracket: escape '}' with '\\\\}' to match literally with the 'u' or 'v' flag"

export type loneClosingBraceMessage =
	"Lone quantifier bracket: escape '}' with '\\}' to match literally with the 'u' or 'v' flag"
