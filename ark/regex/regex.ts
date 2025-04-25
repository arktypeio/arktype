import type {
	Backslash,
	ErrorMessage,
	inferred,
	leftIfEqual,
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

type appendQuantifiable<
	sequence extends string[],
	quantifiable extends string[],
	result extends string[] = []
> =
	quantifiable extends [] ? sequence
	: sequence extends shiftBranches<infer seqHead, infer seqTail> ?
		appendQuantifiable<
			seqTail,
			quantifiable,
			[...result, ..._appendQuantifiable<seqHead, quantifiable, []>]
		>
	:	result

type _appendQuantifiable<
	head extends string,
	quantifiable extends string[],
	result extends string[]
> =
	quantifiable extends (
		shiftBranches<infer quantifiableHead, infer quantifiableTail>
	) ?
		_appendQuantifiable<
			head,
			quantifiableTail,
			[...result, `${head}${quantifiableHead}`]
		>
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
	quantifiable: string[]
}

declare namespace GroupState {
	export type Initial = s.from<{
		branches: []
		sequence: [""]
		quantifiable: []
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
			lookahead extends "." ?
				parse<unscanned, groups, s.shiftQuantifiable<s, [string]>>
			: lookahead extends Backslash ?
				parseEscapedChar<unscanned> extends (
					ParsedEscapeSequence<infer result, infer nextUnscanned>
				) ?
					result extends ErrorMessage ?
						result
					:	parse<nextUnscanned, groups, s.shiftQuantifiable<s, [result]>>
				:	never
			: lookahead extends "|" ? parse<unscanned, groups, s.finalizeBranch<s>>
			: lookahead extends Anchor ?
				parse<unscanned, groups, s.anchor<s, lookahead>>
			: lookahead extends "(" ?
				parse<unscanned, [...groups, s], GroupState.Initial>
			: lookahead extends ")" ? parseGroup<unscanned, groups, s>
			: lookahead extends "?" ?
				s["quantifiable"] extends [] ?
					UnmatchedQuantifierError<"?">
				:	parse<unscanned, groups, pushQuantified<s, [...s["quantifiable"], ""]>>
			: lookahead extends "+" ?
				s["quantifiable"] extends [] ?
					UnmatchedQuantifierError<"+">
				:	parse<
						unscanned,
						groups,
						pushQuantified<s, suffix<s["quantifiable"], string>>
					>
			: lookahead extends "*" ?
				s["quantifiable"] extends [] ?
					UnmatchedQuantifierError<"*">
				:	parse<
						unscanned,
						groups,
						pushQuantified<s, ["", ...suffix<s["quantifiable"], string>]>
					>
			:	parse<unscanned, groups, s.shiftQuantifiable<s, [lookahead]>>
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
				s.shiftQuantifiable<popGroup, s.finalizeBranch<s>["branches"]>
			>
		:	ErrorMessage<writeUnmatchedGroupCloseMessage<unscanned>>

	export type shiftQuantifiable<
		s extends GroupState,
		quantifiable extends string[]
	> = from<{
		branches: s["branches"]
		sequence: appendQuantifiable<s["sequence"], s["quantifiable"]>
		quantifiable: quantifiable
	}>

	export type pushQuantified<
		s extends GroupState,
		quantified extends string[]
	> = from<{
		branches: s["branches"]
		sequence: appendQuantifiable<s["sequence"], quantified>
		quantifiable: []
	}>

	export type finalizeBranch<s extends GroupState> = from<{
		branches: [
			...s["branches"],
			...appendQuantifiable<s["sequence"], s["quantifiable"]>
		]
		sequence: [""]
		quantifiable: []
	}>

	export type anchor<s extends GroupState, a extends Anchor> = from<{
		branches: s["branches"]
		// if anchor is ^, s["sequence"] and s["quantifiable"] should always be empty here if the regex is valid,
		// but we append to it since we handle that error during root-level finalization
		sequence: appendQuantifiable<
			appendQuantifiable<s["sequence"], s["quantifiable"]>,
			[ParsedAnchor<a>]
		>
		quantifiable: []
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

type UnmatchedQuantifierError<quantifier extends string> =
	ErrorMessage<`Quantifier ${quantifier} requires a preceding token`>

export type suffix<quantifiable extends string[], suffix extends string> = [
	...quantifiable,
	...{ [i in keyof quantifiable]: `${quantifiable[i]}${string}` }
]

export type quantify<
	quantifiable extends string[],
	quantifier extends string,
	min extends number,
	max extends number
> =
	quantifiable extends [] ? UnmatchedQuantifierError<quantifier>
	:	_loopUntilMin<quantifiable, min, max, [], { [i in keyof quantifiable]: "" }>

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
			{ [i in keyof s]: `${repetitions[i & keyof repetitions]}${s[i]}` }
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
				{ [i in keyof s]: `${repetitions[i & keyof repetitions]}${s[i]}` }
			>
		]
