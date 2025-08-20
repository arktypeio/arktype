import type { array, Scanner } from "@ark/util"
import type {
	depthOf,
	RegexAst,
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
> = _loopUntilMin<base, depthOf<base>, min, max, [], [1]>

type _loopUntilMin<
	base extends RegexAst,
	baseDepth extends 1[],
	min extends number,
	max extends number | null,
	repetitions extends RegexAst[],
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
			array.multiply<repetitionDepth, baseDepth["length"]>
		>

type _loopUntilMax<
	base extends RegexAst,
	baseDepth extends 1[],
	min extends number,
	max extends number,
	repetitions extends RegexAst[],
	repetitionDepth extends 1[],
	branches extends SequenceTree[],
	branchesDepth extends 1[],
	nextRepetitions extends RegexAst[] = [...repetitions, base],
	nextRepetitionDepth extends 1[] = array.multiply<
		repetitionDepth,
		baseDepth["length"]
	>
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
