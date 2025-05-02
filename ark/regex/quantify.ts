import type { conform, repeat, Scanner } from "@ark/util"
import type {
	depthOf,
	PatternTree,
	pushQuantifiable,
	s,
	SequenceTree,
	State,
	UnionTree
} from "./state.ts"

export type parseBuiltinQuantifier<
	s extends State,
	quantifier extends QuantifyingChar,
	unscanned extends string
> =
	s["root"] extends "" ? s.error<writeUnmatchedQuantifierError<quantifier>>
	:	s.pushQuantified<
			s,
			quantifyBuiltin<quantifier, s["root"]>,
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
		s["root"] extends "" ?
			s.error<
				writeUnmatchedQuantifierError<
					unscanned extends `${infer range}${parsed["unscanned"]}` ? `{${range}`
					:	never
				>
			>
		:	applyQuantified<
				s,
				conform<quantify<s["root"], parsed["min"], parsed["max"]>, PatternTree>,
				parsed["unscanned"]
			>
	:	s.shiftQuantifiable<s, "{", unscanned>

type applyQuantified<
	s extends State,
	quantified extends PatternTree,
	unscanned extends string
> = s.pushQuantified<
	s,
	quantified,
	unscanned extends Scanner.shift<"?", infer lazyUnscanned> ? lazyUnscanned
	:	unscanned
>

type quantifyBuiltin<
	quantifier extends QuantifyingChar,
	tree extends PatternTree
> =
	quantifier extends "?" ? UnionTree<[tree, ""], [...depthOf<tree>, 1]>
	: quantifier extends "+" ? pushQuantifiable<tree, string>
	: quantifier extends "*" ?
		UnionTree<[pushQuantifiable<tree, string>, ""], [...depthOf<tree>, 1]>
	:	never

type quantify<
	base extends PatternTree,
	min extends number,
	max extends number | null
> = _loopUntilMin<base, depthOf<base>, min, max, [], [1]>

type _loopUntilMin<
	base extends PatternTree,
	baseDepth extends 1[],
	min extends number,
	max extends number | null,
	repetitions extends PatternTree[],
	repetitionDepth extends 1[]
> =
	repetitions["length"] extends min ?
		max extends number ?
			max extends min ?
				// avoid handling a range like {2} as a 1-branch union
				repetitions["length"] extends 1 ?
					repetitions[0]
				:	SequenceTree<repetitions, repetitionDepth>
			:	_loopUntilMax<
					base,
					baseDepth,
					min,
					max,
					repetitions,
					repetitionDepth,
					[SequenceTree<repetitions, repetitionDepth>],
					repetitionDepth
				>
		:	SequenceTree<[...repetitions, string], repetitionDepth>
	:	_loopUntilMin<
			base,
			baseDepth,
			min,
			max,
			[...repetitions, base],
			repeat<repetitionDepth, baseDepth["length"]>
		>

type _loopUntilMax<
	base extends PatternTree,
	baseDepth extends 1[],
	min extends number,
	max extends number,
	repetitions extends PatternTree[],
	repetitionDepth extends 1[],
	branches extends SequenceTree[],
	branchesDepth extends 1[],
	nextRepetitions extends PatternTree[] = [...repetitions, base],
	nextRepetitionDepth extends 1[] = repeat<repetitionDepth, baseDepth["length"]>
> =
	repetitions["length"] extends max ? UnionTree<branches, branchesDepth>
	:	_loopUntilMax<
			base,
			baseDepth,
			min,
			max,
			nextRepetitions,
			nextRepetitionDepth,
			[...branches, SequenceTree<nextRepetitions, nextRepetitionDepth>],
			[...branchesDepth, ...nextRepetitionDepth]
		>

export type QuantifyingChar = "*" | "+" | "?"

export const writeUnmatchedQuantifierError = <quantifier extends string>(
	quantifier: quantifier
): writeUnmatchedQuantifierError<quantifier> =>
	`Quantifier ${quantifier} requires a preceding token`

export type writeUnmatchedQuantifierError<quantifier extends string> =
	`Quantifier ${quantifier} requires a preceding token`
