import type { conform, Scanner } from "@ark/util"
import type { s, SequenceTree, State, UnionTree } from "./state.ts"

export type parseBuiltinQuantifier<
	s extends State,
	quantifier extends QuantifyingChar,
	unscanned extends string
> =
	s["quantifiable"] extends [] ?
		s.error<writeUnmatchedQuantifierError<quantifier>>
	:	s.pushQuantified<
			s,
			quantifyBuiltin<quantifier, s["quantifiable"]>,
			unscanned extends Scanner.shift<"?", infer lazyUnscanned> ? lazyUnscanned
			:	unscanned
		>

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
		s["quantifiable"] extends [] ?
			s.error<
				writeUnmatchedQuantifierError<
					unscanned extends `${infer range}${parsed["unscanned"]}` ? `{${range}`
					:	never
				>
			>
		:	applyQuantified<
				s,
				quantify<s["quantifiable"], parsed["min"], parsed["max"]>,
				parsed["unscanned"]
			>
	:	s.shiftQuantifiable<s, "{", unscanned>

type applyQuantified<
	s extends State,
	quantified extends SequenceTree,
	unscanned extends string
> = s.pushQuantified<
	s,
	quantified,
	unscanned extends Scanner.shift<"?", infer lazyUnscanned> ? lazyUnscanned
	:	unscanned
>

type quantifyBuiltin<
	quantifier extends QuantifyingChar,
	tree extends SequenceTree
> =
	quantifier extends "?" ? UnionTree<[tree, ""]>
	: quantifier extends "+" ? [tree, string]
	: quantifier extends "*" ? UnionTree<[[tree, string], ""]>
	: never

type Result = quantify<"a", 2, 4>
//   ^?

type quantify<
	token extends SequenceTree,
	min extends number,
	max extends number | null
> = _loopUntilMin<token, min, max, []>

type _loopUntilMin<
	token extends SequenceTree,
	min extends number,
	max extends number | null,
	repetitions extends SequenceTree[]
> =
	repetitions["length"] extends min ?
		max extends number ?
			max extends min ?
				// avoid handling a range like {2} as a 1-branch union
				repetitions
			:	_loopUntilMax<token, min, max, repetitions, [repetitions]>
		:	[...repetitions, string]
	:	_loopUntilMin<token, min, max, [...repetitions, token]>

type _loopUntilMax<
	tree extends SequenceTree,
	min extends number,
	max extends number,
	repetitions extends SequenceTree[],
	branches extends SequenceTree[],
	nextRepetitions extends SequenceTree[] = [...repetitions, tree]
> =
	repetitions["length"] extends max ? UnionTree<branches>
	:	_loopUntilMax<
			tree,
			min,
			max,
			nextRepetitions,
			[...branches, nextRepetitions]
		>

export type QuantifyingChar = "*" | "+" | "?"

export const writeUnmatchedQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeUnmatchedQuantifierError<quantifier> =>
	`Quantifier ${quantifier} requires a preceding token`

export type writeUnmatchedQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} requires a preceding token`
