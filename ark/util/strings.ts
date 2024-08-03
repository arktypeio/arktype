export const capitalize = <s extends string>(s: s): Capitalize<s> =>
	(s[0].toUpperCase() + s.slice(1)) as never

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
		source.at(-1) === "$" ? -1 : undefined
	)
}

export const escapeToken = "\\"

export type EscapeToken = typeof escapeToken

export const whiteSpaceTokens = {
	" ": true,
	"\n": true,
	"\t": true
} as const

export type WhiteSpaceToken = keyof typeof whiteSpaceTokens

export type trim<s extends string> = trimEnd<trimStart<s>>

export type trimStart<s extends string> =
	s extends `${WhiteSpaceToken}${infer tail}` ? trimEnd<tail> : s

export type trimEnd<s extends string> =
	s extends `${infer init}${WhiteSpaceToken}` ? trimEnd<init> : s

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
