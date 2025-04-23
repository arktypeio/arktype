import { bench } from "@ark/attest"
import type { ErrorMessage, Scanner, WhitespaceChar } from "@ark/util"
import { type } from "arktype"
import type { writeUnmatchedGroupCloseMessage } from "arktype/internal/parser/reduce/shared.ts"

export type Backslash = "\\"
export type Quantifier = "*" | "+" | "?" | "{"
export type Boundary = Anchor | "(" | ")" | "[" | "]"
export type Anchor = "^" | "$"
export type Control = Quantifier | Boundary | "|" | "."

type inferRegex<unscanned extends string> = finalize<
	continueSequence<unscanned, [], GroupState.Initial>
>

type GroupState = {
	branches: string
	sequence: string
	last: string | empty
}

declare namespace GroupState {
	export type Initial = {
		branches: never
		sequence: ""
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
		:	`${startStripped}${string}`
	: result extends `${infer endStripped}${ParsedAnchor<"$">}` ?
		`${string}${endStripped}`
	:	`${string}${result}${string}`

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

type sequenceWithLast<s extends GroupState> =
	s["last"] extends string ? `${s["sequence"]}${s["last"]}` : s["sequence"]

type updateState<s extends GroupState, last extends string | empty> = {
	branches: s["branches"]
	sequence: sequenceWithLast<s>
	last: last
}

type finalizeBranch<s extends GroupState> = {
	branches: s["branches"] | sequenceWithLast<s>
	sequence: ""
	last: empty
}

type anchor<s extends GroupState, a extends Anchor> = {
	branches: s["branches"]
	// if Anchor is ^, s["sequence"] and s["last"] should always be empty here if the regex is valid,
	// but we append to it since we handle that error during root-level finalization
	sequence: `${sequenceWithLast<s>}${ParsedAnchor<a>}`
	last: empty
}

type continueSequence<
	source extends string,
	groups extends GroupState[],
	s extends GroupState
> =
	source extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends Backslash ?
			parseEscapedChar<unscanned> extends (
				ParsedEscapeSequence<infer result, infer nextUnscanned>
			) ?
				result extends ErrorMessage ?
					result
				:	continueSequence<nextUnscanned, groups, updateState<s, result>>
			:	never
		: lookahead extends "|" ?
			continueSequence<unscanned, groups, finalizeBranch<s>>
		: lookahead extends Anchor ?
			continueSequence<unscanned, groups, anchor<s, lookahead>>
		: lookahead extends "(" ?
			continueSequence<unscanned, [...groups, s], GroupState.Initial>
		: lookahead extends ")" ?
			groups extends (
				[...infer init extends GroupState[], infer last extends GroupState]
			) ?
				continueSequence<
					unscanned,
					init,
					updateState<last, finalizeBranch<s>["branches"]>
				>
			:	ErrorMessage<writeUnmatchedGroupCloseMessage<unscanned>>
		:	continueSequence<unscanned, groups, updateState<s, lookahead>>
	:	groups[number]["branches"] | finalizeBranch<s>["branches"]

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

type TestA = inferRegex<"^^">
//   ^?

type TestB = inferRegex<"a^">
//    ^?

type TestC = inferRegex<"^foo|^bar">
//    ^?

type TestD = inferRegex<"f(^)">
//    ^?

type TestE = inferRegex<"(^bo(innerAnchored$|innerUnanchored))">
//    ^?

bench("string", () => {
	type fdasZ = inferRegex<"typescript|^go$|brrr$">
	//     ^?
}).types([785, "instantiations"])

type validateRegex<src extends string> =
	inferRegex<src> extends ErrorMessage ? inferRegex<src> : src

interface TypedRegExp<pattern extends string = string> extends RegExp {
	test(s: string): s is pattern
}

const regex = <src extends string>(
	src: validateRegex<src>
): TypedRegExp<inferRegex<src>> => new RegExp(src) as never
