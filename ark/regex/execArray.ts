import type { DynamicBase } from "@ark/util"
import type { Flags, NamedCaptures } from "./regex.ts"

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
