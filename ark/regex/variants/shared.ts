import type { DynamicBase, inferred } from "@ark/util"

export type NamedCaptures = Record<string, string>

export type UnicodeFlag = "v" | "u"
export type Flags =
	`${"d" | ""}${"g" | ""}${"i" | ""}${"m" | ""}${"s" | ""}${UnicodeFlag | ""}${"y" | ""}`

export interface Regex<
	pattern extends string,
	flags extends Flags,
	captures extends string[],
	namedCaptures extends NamedCaptures
> extends RegExp {
	[inferred]: pattern
	infer: pattern
	inferCaptures: captures
	inferNamedCaptures: namedCaptures

	flags: flags

	test(s: string): s is pattern
	exec(
		s: string
	): RegexExecArray<[pattern, ...captures], namedCaptures, flags> | null
}

export type RegexExecArray<
	patternAndCaptures extends string[],
	namedCaptures extends NamedCaptures,
	flags extends Flags
> =
	{} extends namedCaptures ?
		flags extends `${string}d${string}` ?
			MatchesWithIndices<patternAndCaptures>
		:	BaseRegexExecArray<patternAndCaptures>
	: flags extends `${string}d${string}` ?
		MatchesWithIndicesAndNames<patternAndCaptures, namedCaptures>
	:	MatchesWithNames<patternAndCaptures, namedCaptures>

interface BaseRegexExecArray<patternAndCaptures extends string[]>
	extends DynamicBase<patternAndCaptures> {
	/**
	 * The index of the search at which the result was found.
	 */
	index: number

	/**
	 * A copy of the search string.
	 */
	input: patternAndCaptures[0]
}

interface MatchesWithIndices<patternAndCaptures extends string[]>
	extends BaseRegexExecArray<patternAndCaptures> {
	indices: { [i in keyof patternAndCaptures]: [number, number] }
}

interface MatchesWithNames<
	patternAndCaptures extends string[],
	namedCaptures extends NamedCaptures
> extends BaseRegexExecArray<patternAndCaptures> {
	groups: namedCaptures
}

interface MatchesWithIndicesAndNames<
	patternAndCaptures extends string[],
	namedCaptures extends NamedCaptures
> extends MatchesWithNames<patternAndCaptures, namedCaptures> {
	indices: MatchIndicesWithNames<patternAndCaptures, namedCaptures>
}

export type RegexIndexRange = [start: number, end: number]

interface BaseRegexIndicesArray<patternAndCaptures extends string[]>
	extends DynamicBase<{ [i in keyof patternAndCaptures]: RegexIndexRange }> {}

interface MatchIndicesWithNames<
	patternAndCaptures extends string[],
	namedCaptures extends NamedCaptures
> extends BaseRegexIndicesArray<patternAndCaptures> {
	groups: { [k in keyof namedCaptures]: RegexIndexRange }
}

declare const r: Regex<"foo", "d", ["bar"], { baz: "baz" }>

// TODO: fix regex group could be undefined if quantified by 0
