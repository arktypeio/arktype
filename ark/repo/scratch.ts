import { bench } from "@ark/attest"
import type {
	Backslash,
	ErrorMessage,
	Scanner,
	WhitespaceChar
} from "@ark/util"

export type Quantifier = "*" | "+" | "?" | "{"
export type Boundary = "^" | "$" | "(" | ")" | "[" | "]"

export type Control = Quantifier | Boundary | "|" | "."

type inferRegex<unscanned extends string> = parseSequence<unscanned, []>

type GroupState = {
	branches: string
	sequence: string
	last: string | empty
}

type parseSequence<source extends string, groups extends GroupState[]> =
	continueSequence<
		source,
		groups,
		{
			branches: never
			sequence: ""
			last: empty
		}
	> extends infer result extends string ?
		result extends ErrorMessage ? result
		: groups extends [] ?
			result extends StartAnchorAst<infer inner> ?
				inner
			:	`${string}${result}`
		:	result
	:	never

type StartAnchorAst<s extends string> = `$ark^${s}`

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

type anchorStart<s extends GroupState> = {
	branches: s["branches"]
	sequence: StartAnchorAst<"">
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
		: lookahead extends "^" ?
			[allGroupsEmpty<groups>, s["last"]] extends [true, empty] ?
				s["sequence"] extends "" ?
					continueSequence<unscanned, groups, anchorStart<s>>
				:	ErrorMessage<`Anchor ^ may not appear mid-pattern`>
			:	ErrorMessage<`Anchor ^ may not appear mid-pattern`>
		: lookahead extends "(" ?
			continueSequence<unscanned, groups, updateState<s, lookahead>>
		:	continueSequence<unscanned, groups, updateState<s, lookahead>>
	:	groups[number]["branches"] | finalizeBranch<s>["branches"]

type allGroupsEmpty<groups extends unknown[]> =
	groups extends [infer head extends GroupState, ...infer tail] ?
		head["sequence"] extends "" ?
			allGroupsEmpty<tail>
		:	false
	:	true

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

type TestE = inferRegex<"(^)">
//    ^?

bench("string", () => {
	type fdasZ = inferRegex<"abc|^br?|superfood|okok">
	//     ^?
}).types([317, "instantiations"])
