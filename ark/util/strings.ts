import type { KeySet } from "./records.ts"

export const capitalize = <s extends string>(s: s): Capitalize<s> =>
	(s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)) as never

export const uncapitalize = <s extends string>(s: s): Uncapitalize<s> =>
	(s.length === 0 ? s : s[0].toLowerCase() + s.slice(1)) as never

export type firstChar<s extends string> =
	s extends `${infer head}${string}` ? head : ""

export type charsAfterFirst<s extends string> =
	s extends `${string}${infer tail}` ? tail : ""

export type lastChar<s extends string> =
	s extends `${infer head}${infer tail}` ?
		tail extends "" ?
			head
		:	lastChar<tail>
	:	s

export type charsBeforeLast<s extends string> =
	s extends `${infer head}${infer tail}` ?
		tail extends "" ?
			""
		:	`${head}${charsBeforeLast<tail>}`
	:	""

export type contains<s extends string, sub extends string> =
	s extends `${string}${sub}${string}` ? true : false

export const anchoredRegex = (regex: RegExp | string): RegExp =>
	new RegExp(
		anchoredSource(regex),
		typeof regex === "string" ? "" : regex.flags
	)

export const deanchoredRegex = (regex: RegExp | string): RegExp =>
	new RegExp(
		deanchoredSource(regex),
		typeof regex === "string" ? "" : regex.flags
	)

export const anchoredSource = (regex: RegExp | string): string => {
	const source = typeof regex === "string" ? regex : regex.source
	return `^(?:${source})$`
}

export const deanchoredSource = (regex: RegExp | string): string => {
	const source = typeof regex === "string" ? regex : regex.source

	if (source.startsWith("^(?:") && source.endsWith(")$"))
		return source.slice(4, -2)

	return source.slice(
		source[0] === "^" ? 1 : 0,
		source[source.length - 1] === "$" ? -1 : undefined
	)
}

export const RegexPatterns = {
	negativeLookahead: (pattern: string) => `(?!${pattern})` as const,
	nonCapturingGroup: (pattern: string) => `(?:${pattern})` as const
}

export const Backslash = "\\"

export type Backslash = typeof Backslash

export const whitespaceChars = {
	" ": 1,
	"\n": 1,
	"\t": 1
} as const satisfies KeySet

export type WhitespaceChar = keyof typeof whitespaceChars

export type trim<s extends string> = trimEnd<trimStart<s>>

export type trimStart<s extends string> =
	s extends `${WhitespaceChar}${infer tail}` ? trimEnd<tail> : s

export type trimEnd<s extends string> =
	s extends `${infer init}${WhitespaceChar}` ? trimEnd<init> : s

// Credit to @gugaguichard for this! https://x.com/gugaguichard/status/1720528864500150534
export type isStringLiteral<t> =
	[t] extends [string] ?
		[string] extends [t] ? false
		: Uppercase<t> extends Uppercase<Lowercase<t>> ?
			Lowercase<t> extends Lowercase<Uppercase<t>> ?
				true
			:	false
		:	false
	:	false

export const emojiToUnicode = (emoji: string): string =>
	emoji
		.split("")
		.map(char => {
			const codePoint = char.codePointAt(0)
			return codePoint ? `\\u${codePoint.toString(16).padStart(4, "0")}` : ""
		})
		.join("")

export const alphabet = [
	"a",
	"b",
	"c",
	"d",
	"e",
	"f",
	"g",
	"h",
	"i",
	"j",
	"k",
	"l",
	"m",
	"n",
	"o",
	"p",
	"q",
	"r",
	"s",
	"t",
	"u",
	"v",
	"w",
	"x",
	"y",
	"z"
] as const

// cyrb53's two 32-bit lanes, a 64-bit string hash
export const hashOf = (input: string): string => {
	let h1 = 0xdeadbeef
	let h2 = 0x41c6ce57
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i)
		h1 = Math.imul(h1 ^ code, 2654435761)
		h2 = Math.imul(h2 ^ code, 1597334677)
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
	return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36).padStart(7, "0")
}
