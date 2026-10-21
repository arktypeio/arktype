import { isKeyOf, whitespaceChars, type Scanner } from "@ark/util"
import type { Comparator } from "../reduce/shared.ts"

export const terminatingChars = {
	"<": 1,
	">": 1,
	"=": 1,
	"|": 1,
	"&": 1,
	")": 1,
	"[": 1,
	"%": 1,
	",": 1,
	":": 1,
	"?": 1,
	"#": 1,
	...whitespaceChars
} as const

export type TerminatingChar = keyof typeof terminatingChars

// a token ends at a terminating char, or at != so a name like a!b still parses
export const shiftUntilTerminator = (scanner: Scanner): string => {
	const token = scanner.shiftUntilLookahead(terminatingChars)
	if (!token.endsWith("!") || scanner.lookahead !== "=") return token
	scanner.i--
	return token.slice(0, -1)
}

export type shiftUntilTerminator<unscanned extends string> =
	shiftComparatorBang<Scanner.shiftUntil<unscanned, TerminatingChar>>

// a ! ending a token before = starts a != comparator
type shiftComparatorBang<result extends [string, string]> =
	result[1] extends `=${string}` ?
		result[0] extends `${infer name}!` ?
			[name, `!${result[1]}`]
		:	result
	:	result

export const finalizingLookaheads = {
	">": 1,
	",": 1,
	"": 1,
	"=": 1,
	"?": 1
} as const

export type FinalizingLookahead = keyof typeof finalizingLookaheads

export const lookaheadIsFinalizing = (
	lookahead: string,
	unscanned: string
): lookahead is ">" | "," | "=" | "?" =>
	lookahead === ">" ?
		unscanned[0] === "=" ?
			// >== would only occur in an expression like Array<number>==5
			// otherwise, >= would only occur as part of a bound like number>=5
			unscanned[1] === "="
			// if > is the end of a generic instantiation, the next token will be
			// an operator or the end of the string
		:	unscanned.trimStart() === "" ||
			isKeyOf(unscanned.trimStart()[0], terminatingChars) ||
			unscanned.trimStart().startsWith("!=")
		// "=" is a finalizer on its own (representing a default value),
		// but not with a second "=" (an equality comparator)
	: lookahead === "=" ? unscanned[0] !== "="
		// "," and "?" are unambiguously finalizers
	: lookahead === "," || lookahead === "?"

export type lookaheadIsFinalizing<
	lookahead extends string,
	unscanned extends string
> =
	lookahead extends ">" ?
		unscanned extends `=${infer nextUnscanned}` ?
			nextUnscanned extends `=${string}` ?
				true
			:	false
		: Scanner.skipWhitespace<unscanned> extends (
			"" | `${TerminatingChar}${string}` | `!=${string}`
		) ?
			true
		:	false
	: lookahead extends "=" ?
		unscanned extends `=${string}` ?
			false
		:	true
	: lookahead extends "," | "?" ? true
	: false

export type InfixToken =
	| Comparator
	| "|"
	| "&"
	| "%"
	| ":"
	| "=>"
	| "|>"
	| "#"
	| "@"
	| "="

export type PostfixToken = "[]" | "?"

export type OperatorToken = InfixToken | PostfixToken
