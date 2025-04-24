import type {
	Backslash,
	ErrorMessage,
	inferred,
	leftIfEqual,
	repeat,
	Scanner,
	WhitespaceChar,
	writeUnmatchedGroupCloseMessage
} from "@ark/util"

export interface Regex<pattern extends string = string> extends RegExp {
	[inferred]: pattern
	infer: pattern

	test(s: string): s is pattern
}

export const regex = <src extends string>(
	src: regex.validate<src>
): Regex<regex.infer<src>> => new RegExp(src) as never

export type regex<pattern extends string = string> = Regex<pattern>

export declare namespace regex {
	export type infer<src extends string> = finalize<parse<src>>

	export type validate<src extends string> =
		regex.infer<src> extends ErrorMessage ? regex.infer<src> : src

	export type parse<src extends string> = s.parse<src, [], GroupState.Initial>
}

export type Quantifier = "*" | "+" | "?" | "{"
export type Boundary = Anchor | "(" | ")" | "[" | "]"
export type Anchor = "^" | "$"
export type Control = Quantifier | Boundary | "|" | "."

type finalize<result extends ErrorMessage | string[]> =
	result extends string[] ?
		validateNoMidPatternAnchors<anchorsAway<result[number]>>
	: result extends ErrorMessage ? result
	: never

type anchorsAway<result extends string> =
	result extends `${ParsedAnchor<"^">}${infer startStripped}` ?
		startStripped extends `${infer bothStripped}${ParsedAnchor<"$">}` ?
			bothStripped
		:	appendNonRedundant<startStripped, string>
	: result extends `${infer endStripped}${ParsedAnchor<"$">}` ?
		prependNonRedundant<endStripped, string>
	:	prependNonRedundant<appendNonRedundant<result, string>, string>

type validateNoMidPatternAnchors<inner extends string> =
	inner extends `${string}$ark${infer anchor extends Anchor}${string}` ?
		AnchorMidPatternError<anchor>
	:	inner

type AnchorMidPatternError<anchor extends Anchor> =
	ErrorMessage<`Anchor ${anchor} may not appear mid-pattern`>

type ParsedAnchor<a extends Anchor> = `$ark${a}`

type shiftBranches<head extends string, tail extends string[]> = [head, ...tail]

type appendLast<
	sequence extends string[],
	last extends string[],
	result extends string[] = []
> =
	last extends [] ? sequence
	: sequence extends shiftBranches<infer seqHead, infer seqTail> ?
		appendLast<seqTail, last, [...result, ..._appendLast<seqHead, last, []>]>
	:	result

type _appendLast<
	head extends string,
	last extends string[],
	result extends string[]
> =
	last extends shiftBranches<infer lastHead, infer lastTail> ?
		_appendLast<head, lastTail, [...result, `${head}${lastHead}`]>
	:	result

// avoid string expanding to `${string}${string}`
type appendNonRedundant<
	base extends string,
	suffix extends string
> = leftIfEqual<base, `${base}${suffix}`>

type prependNonRedundant<
	base extends string,
	prefix extends string
> = leftIfEqual<base, `${prefix}${base}`>

export type GroupState = {
	branches: string[]
	sequence: string[]
	last: string[]
}

declare namespace GroupState {
	export type Initial = s.from<{
		branches: []
		sequence: [""]
		last: []
	}>
}

declare namespace s {
	export type from<s extends GroupState> = s

	export type parse<
		source extends string,
		groups extends GroupState[],
		s extends GroupState
	> =
		source extends Scanner.shift<infer lookahead, infer unscanned> ?
			lookahead extends "." ? parse<unscanned, groups, s.pushToken<s, [string]>>
			: lookahead extends Backslash ?
				parseEscapedChar<unscanned> extends (
					ParsedEscapeSequence<infer result, infer nextUnscanned>
				) ?
					result extends ErrorMessage ?
						result
					:	parse<nextUnscanned, groups, s.pushToken<s, [result]>>
				:	never
			: lookahead extends "|" ? parse<unscanned, groups, s.finalizeBranch<s>>
			: lookahead extends Anchor ?
				parse<unscanned, groups, s.anchor<s, lookahead>>
			: lookahead extends "(" ?
				parse<unscanned, [...groups, s], GroupState.Initial>
			: lookahead extends ")" ? parseGroup<unscanned, groups, s>
			: lookahead extends "?" ?
				quantify<s["last"], lookahead, 0, 1> extends infer quantified ?
					quantified extends string[] ?
						parse<unscanned, groups, quantifyLast<s, quantified>>
					:	quantified
				:	never
			:	parse<unscanned, groups, s.pushToken<s, [lookahead]>>
		:	[
				...{ [i in keyof groups]: groups[i]["branches"] },
				...s.finalizeBranch<s>["branches"]
			]

	type parseGroup<
		unscanned extends string,
		groups extends GroupState[],
		s extends GroupState
	> =
		groups extends (
			[...infer init extends GroupState[], infer popGroup extends GroupState]
		) ?
			parse<
				unscanned,
				init,
				s.pushToken<popGroup, s.finalizeBranch<s>["branches"]>
			>
		:	ErrorMessage<writeUnmatchedGroupCloseMessage<unscanned>>

	export type pushToken<s extends GroupState, last extends string[]> = from<{
		branches: s["branches"]
		sequence: appendLast<s["sequence"], s["last"]>
		last: last
	}>

	export type quantifyLast<s extends GroupState, last extends string[]> = from<{
		branches: s["branches"]
		sequence: appendLast<s["sequence"], last>
		last: []
	}>

	export type finalizeBranch<s extends GroupState> = from<{
		branches: [...s["branches"], ...appendLast<s["sequence"], s["last"]>]
		sequence: [""]
		last: []
	}>

	export type anchor<s extends GroupState, a extends Anchor> = from<{
		branches: s["branches"]
		// if anchor is ^, s["sequence"] and s["last"] should always be empty here if the regex is valid,
		// but we append to it since we handle that error during root-level finalization
		sequence: appendLast<
			appendLast<s["sequence"], s["last"]>,
			[ParsedAnchor<a>]
		>
		last: []
	}>
}

type ParsedEscapeSequence<result extends string, unscanned extends string> = [
	result: result,
	unscanned: unscanned
]

// all widened to string since TypeScript doesn't have a better type to represent them
type StringClassChar = "w" | "W" | "D" | "S"

type parseEscapedChar<source extends string> =
	source extends Scanner.shift<infer lookahead, infer unscanned> ?
		ParsedEscapeSequence<
			lookahead extends StringClassChar ? string
			: lookahead extends "d" ? `${bigint}`
			: lookahead extends "s" ? WhitespaceChar
			: lookahead extends Control ? lookahead
			: ErrorMessage<`Escape preceding ${lookahead} is unnecessary and should be removed.`>,
			unscanned
		>
	:	ParsedEscapeSequence<ErrorMessage<`A regex cannot end with \\`>, "">

export type quantify<
	last extends string[],
	quantifier extends string,
	min extends number,
	max extends number
> =
	last extends [] ?
		ErrorMessage<`Quantifier ${quantifier} requires a preceding token`>
	:	_loopUntilMin<last, min, max, [], { [i in keyof last]: "" }>

type _loopUntilMin<
	s extends string[],
	min extends number,
	max extends number,
	i extends 1[],
	repetitions extends string[]
> =
	i["length"] extends min ? _loopUntilMax<s, min, max, i, repetitions>
	:	_loopUntilMin<
			s,
			min,
			max,
			[...i, 1],
			{ [i in keyof s]: `${repetitions[i]}${s[i]}` }
		>

type _loopUntilMax<
	s extends string[],
	min extends number,
	max extends number,
	i extends 1[],
	repetitions extends string[]
> =
	i["length"] extends max ? repetitions
	:	[
			...repetitions,
			..._loopUntilMax<
				s,
				min,
				max,
				[...i, 1],
				{ [i in keyof s]: `${repetitions[i]}${s[i]}` }
			>
		]
