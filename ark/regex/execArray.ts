import type { DynamicBase } from "@ark/util"
import type { Flags, IndexedCaptures, NamedCaptures } from "./regex.ts"

export type RegexExecArray<
	patternAndCaptures extends IndexedCaptures,
	namedCaptures extends NamedCaptures,
	flags extends Flags
> =
	keyof namedCaptures extends never ?
		flags extends `${string}d${string}` ?
			MatchesWithIndices<patternAndCaptures>
		:	BaseRegexExecArray<patternAndCaptures>
	: flags extends `${string}d${string}` ?
		MatchesWithIndicesAndNames<patternAndCaptures, namedCaptures>
	:	MatchesWithNames<patternAndCaptures, namedCaptures>

interface BaseRegexExecArray<patternAndCaptures extends IndexedCaptures>
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

interface MatchesWithIndices<patternAndCaptures extends IndexedCaptures>
	extends BaseRegexExecArray<patternAndCaptures> {
	indices: { [i in keyof patternAndCaptures]: [number, number] }
}

interface MatchesWithNames<
	patternAndCaptures extends IndexedCaptures,
	namedCaptures extends NamedCaptures
> extends BaseRegexExecArray<patternAndCaptures> {
	groups: namedCaptures
}

interface MatchesWithIndicesAndNames<
	patternAndCaptures extends IndexedCaptures,
	namedCaptures extends NamedCaptures
> extends MatchesWithNames<patternAndCaptures, namedCaptures> {
	indices: MatchIndicesWithNames<patternAndCaptures, namedCaptures>
}

export type RegexIndexRange = [start: number, end: number]

interface BaseRegexIndicesArray<patternAndCaptures extends IndexedCaptures>
	extends DynamicBase<{ [i in keyof patternAndCaptures]: RegexIndexRange }> {}

interface MatchIndicesWithNames<
	patternAndCaptures extends IndexedCaptures,
	namedCaptures extends NamedCaptures
> extends BaseRegexIndicesArray<patternAndCaptures> {
	groups: { [k in keyof namedCaptures]: RegexIndexRange }
}
