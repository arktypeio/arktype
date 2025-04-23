import { bench } from "@ark/attest"
import type { Backslash, Scanner, unset, WhitespaceChar } from "@ark/util"

type inferRegex<unscanned extends string> = parseSequence<
	unscanned,
	never,
	"",
	""
>

export type Quantifier = "*" | "+" | "?" | "{" | "}"
export type Boundary = "^" | "$" | "(" | ")" | "[" | "]"
export type Operator = "|" | "."
export type Escape = "\\"

export type Control = Quantifier | Boundary | Operator | Escape

export type StringClassChar = "w" | "W" | "D" | "S"

type result = inferRegex<"afgdsfa|fsdhaoi|bag?|fdsa">
//    ^?

type parseSequence<
	remaining extends string,
	branches extends string,
	last extends string,
	sequence extends string
> =
	remaining extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends Backslash ?
			unscanned extends (
				Scanner.shift<infer nextLookahead, infer nextUnscanned>
			) ?
				nextLookahead extends StringClassChar ?
					parseSequence<nextUnscanned, branches, string, `${sequence}${last}`>
				: nextLookahead extends "d" ?
					parseSequence<
						nextUnscanned,
						branches,
						`${bigint}`,
						`${sequence}${last}`
					>
				: nextLookahead extends "s" ?
					parseSequence<
						nextUnscanned,
						branches,
						WhitespaceChar,
						`${sequence}${last}`
					>
				: nextLookahead extends Control | "/" ?
					parseSequence<
						nextUnscanned,
						branches,
						nextLookahead,
						`${sequence}${last}`
					>
				:	"unnecessary escape"
			:	"unmatched backslash"
		: lookahead extends "|" ?
			parseSequence<unscanned, branches | sequence, "", "">
		:	parseSequence<unscanned, branches, lookahead, `${sequence}${last}`>
	:	branches | sequence

bench("string", () => {
	type Z = inferRegex<"abc|br?|superfood|okok">
}).types([465, "instantiations"])
