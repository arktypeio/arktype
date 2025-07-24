import type { DynamicBase } from "@ark/util"
import type { Flags, IndexedCaptures, NamedCaptures } from "./regex.ts"

export interface RegexExecArray<
	patternAndCaptures extends IndexedCaptures,
	namedCaptures extends NamedCaptures,
	flags extends Flags
> extends DynamicBase<patternAndCaptures> {
	/**
	 * The index of the search at which the result was found.
	 */
	index: number

	/**
	 * A copy of the search string.
	 */
	input: patternAndCaptures[0]

	indices: flags extends `${string}d${string}` ?
		RegexIndicesArray<patternAndCaptures, namedCaptures>
	:	undefined

	groups: keyof namedCaptures extends never ? undefined : namedCaptures
}

export type RegexIndexRange = [start: number, end: number]

interface RegexIndicesArray<
	patternAndCaptures extends IndexedCaptures,
	namedCaptures extends NamedCaptures
> extends DynamicBase<{ [i in keyof patternAndCaptures]: RegexIndexRange }> {
	groups: keyof namedCaptures extends never ? undefined
	:	{ [k in keyof namedCaptures]: RegexIndexRange }
}
