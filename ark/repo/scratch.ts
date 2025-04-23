import { bench } from "@ark/attest"
import type {
	Backslash,
	ErrorMessage,
	Scanner,
	WhitespaceChar
} from "@ark/util"

export type Quantifier = "*" | "+" | "?" | "{"
export type Boundary = "^" | "$" | "(" | ")" | "[" | "]"

export type Control = Quantifier | Boundary | "|" | "." | "/"

type inferRegex<unscanned extends string> = parseSequence<unscanned, never>

type parseSequence<
	source extends string,
	inferredBranches extends string
> = continueSequence<source, inferredBranches, [], string, empty>

// we're just using the symbol keyword itself to represent an unset value here
// since it not stringifiable so it must be handled
type empty = symbol

type updateSequence<sequence extends string, last extends string | empty> =
	last extends string ? `${sequence}${last}` : string

type continueSequence<
	source extends string,
	inferredBranches extends string,
	groups extends string[],
	sequence extends string,
	last extends string | empty
> =
	source extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends Backslash ?
			parseEscapedChar<unscanned> extends (
				ParsedEscapeSequence<infer result, infer nextUnscanned>
			) ?
				result extends ErrorMessage ?
					result
				:	continueSequence<
						nextUnscanned,
						inferredBranches,
						groups,
						updateSequence<sequence, last>,
						result
					>
			:	never
		: lookahead extends "|" ?
			parseSequence<unscanned, inferredBranches | sequence>
		: lookahead extends "^" ?
			[allGroupsEmpty<groups>, string, last] extends [true, sequence, empty] ?
				continueSequence<unscanned, inferredBranches, groups, "", empty>
			:	ErrorMessage<`Anchor ^ may not appear mid-pattern`>
		: lookahead extends "$" ?
			ErrorMessage<`Anchor $ may not appear mid-pattern`>
		: lookahead extends "(" ? "groups unsupported"
		: continueSequence<
				unscanned,
				inferredBranches,
				groups,
				updateSequence<sequence, last>,
				lookahead
			>
	:	inferredBranches | sequence

type allGroupsEmpty<groups extends unknown[]> =
	groups extends [infer head, ...infer tail] ?
		string extends head ?
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

bench("string", () => {
	type fdasZ = inferRegex<"abc|^br?|superfood|okok">
	//     ^?
}).types([317, "instantiations"])
