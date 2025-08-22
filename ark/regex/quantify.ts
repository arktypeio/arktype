import type { Scanner } from "@ark/util"
import type { RegexAst, s, SequenceTree, State, UnionTree } from "./state.ts"

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
		s["root"] extends "" ?
			s.error<
				writeUnmatchedQuantifierError<
					unscanned extends `${infer range}${parsed["unscanned"]}` ? `{${range}`
					:	never
				>
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

type quantify<
	base extends RegexAst,
	min extends number,
	max extends number | null
> = _loopUntilMin<base, min, max, []>

//  depthOf<base>
// baseDepth extends 1[],
// repetitionDepth extends 1[]

type _loopUntilMin<
	base extends RegexAst,
	min extends number,
	max extends number | null,
	repetitions extends RegexAst[]
> =
	repetitions["length"] extends min ?
		max extends number ?
			max extends min ?
				// avoid handling a range like {2} as a 1-branch union
				repetitions["length"] extends 1 ?
					repetitions[0]
				:	SequenceTree<repetitions>
			:	_loopUntilMax<base, min, max, repetitions, [SequenceTree<repetitions>]> // repetitionsDepth
		:	SequenceTree<[...repetitions, string]>
	:	_loopUntilMin<base, min, max, [...repetitions, base]> // array.multiply<repetitionDepth, baseDepth["length"]>

// baseDepth extends 1[],
// repetitionDepth extends 1[],
// branchesDepth extends 1[],
// nextRepetitionDepth extends 1[] = array.multiply<
// 	repetitionDepth,
// 	baseDepth["length"]
// >

type _loopUntilMax<
	base extends RegexAst,
	min extends number,
	max extends number,
	repetitions extends RegexAst[],
	branches extends SequenceTree[],
	nextRepetitions extends RegexAst[] = [...repetitions, base]
> =
	repetitions["length"] extends max ?
		UnionTree<branches> // branches depth
	:	_loopUntilMax<
			base,
			min,
			max,
			nextRepetitions,
			[...branches, SequenceTree<nextRepetitions>] // next repetitions depth
		>

export type QuantifyingChar = "*" | "+" | "?"

export const writeUnmatchedQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeUnmatchedQuantifierError<quantifier> =>
	`Quantifier ${quantifier} requires a preceding token`

export type writeUnmatchedQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} requires a preceding token`
