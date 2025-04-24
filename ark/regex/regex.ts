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
	type infer<unscanned extends string> = finalize<
		s.parse<unscanned, [], GroupState.Initial>
	>

	type validate<src extends string> =
		regex.infer<src> extends ErrorMessage ? regex.infer<src> : src
}

export type Quantifier = "*" | "+" | "?" | "{"
export type Boundary = Anchor | "(" | ")" | "[" | "]"
export type Anchor = "^" | "$"
export type Control = Quantifier | Boundary | "|" | "."

type GroupState = {
	branches: string
	sequence: string
	sequenceBranchCounter: 1[]
	last: string | empty
}

declare namespace GroupState {
	export type Initial = {
		branches: never
		sequence: ""
		sequenceBranchCounter: [1]
		last: empty
	}
}

type finalize<result extends string> =
	result extends ErrorMessage ? result
	:	validateNoMidPatternAnchors<anchorsAway<result>>

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

// we're just using the symbol keyword itself to represent an unset value here
// since it not stringifiable so it must be handled
type empty = symbol

type appendLast<sequence extends string, last extends string | empty> =
	last extends string ? appendNonRedundant<sequence, last> : sequence

// avoid string expanding to `${string}${string}`
type appendNonRedundant<
	base extends string,
	suffix extends string
> = leftIfEqual<base, `${base}${suffix}`>

type prependNonRedundant<
	base extends string,
	prefix extends string
> = leftIfEqual<base, `${prefix}${base}`>

declare namespace s {
	export type parse<
		source extends string,
		groups extends GroupState[],
		s extends GroupState
	> =
		source extends Scanner.shift<infer lookahead, infer unscanned> ?
			lookahead extends "." ? parse<unscanned, groups, s.pushToken<s, string>>
			: lookahead extends Backslash ?
				parseEscapedChar<unscanned> extends (
					ParsedEscapeSequence<infer result, infer nextUnscanned>
				) ?
					result extends ErrorMessage ?
						result
					:	parse<nextUnscanned, groups, s.pushToken<s, result>>
				:	never
			: lookahead extends "|" ? parse<unscanned, groups, s.finalizeBranch<s>>
			: lookahead extends Anchor ?
				parse<unscanned, groups, s.anchor<s, lookahead>>
			: lookahead extends "(" ?
				parse<unscanned, [...groups, s], GroupState.Initial>
			: lookahead extends ")" ?
				groups extends (
					[...infer init extends GroupState[], infer last extends GroupState]
				) ?
					parse<
						unscanned,
						init,
						s.pushToken<last, s.finalizeBranch<s>["branches"]>
					>
				:	ErrorMessage<writeUnmatchedGroupCloseMessage<unscanned>>
			: lookahead extends "?" ?
				parse<unscanned, groups, s.pushToken<s, lookahead>>
			:	parse<unscanned, groups, s.pushToken<s, lookahead>>
		:	groups[number]["branches"] | s.finalizeBranch<s>["branches"]

	export type pushToken<s extends GroupState, last extends string | empty> = {
		branches: s["branches"]
		sequence: appendLast<s["sequence"], s["last"]>
		sequenceBranchCounter: s["sequenceBranchCounter"]
		last: last
	}

	export type finalizeBranch<s extends GroupState> = {
		branches: s["branches"] | appendLast<s["sequence"], s["last"]>
		sequence: ""
		sequenceBranchCounter: s["sequenceBranchCounter"]
		last: empty
	}

	export type anchor<s extends GroupState, a extends Anchor> = {
		branches: s["branches"]
		// if anchor is ^, s["sequence"] and s["last"] should always be empty here if the regex is valid,
		// but we append to it since we handle that error during root-level finalization
		sequence: `${appendLast<s["sequence"], s["last"]>}${ParsedAnchor<a>}`
		sequenceBranchCounter: s["sequenceBranchCounter"]
		last: empty
	}
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

// type quantify<
// 	last extends string,
// 	min extends number,
// 	max extends number
// > = repeat<>
