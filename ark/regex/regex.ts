import type { DynamicBase, ErrorMessage, inferred } from "@ark/util"
import type { parseState } from "./parse.ts"
import type { State } from "./state.ts"

export interface Regex<
	pattern extends string = string,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> extends RegExp {
	[inferred]: pattern
	infer: pattern
	inferCaptures: captures
	inferNamedCaptures: namedCaptures

	test(s: string): s is pattern
	exec(s: string): RegexExecArray<pattern, captures, namedCaptures> | null
}

// /^f$/m
// "f" | "F"

const reg: RegExp = {} as Regex

export type NamedCaptures = Record<string, string>

export type RegexExecArray<
	pattern extends string = string,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> = {}

export interface BaseRegexExecArray<
	pattern extends string = string,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> extends DynamicBase<[pattern, ...captures]> {
	/**
	 * The index of the search at which the result was found.
	 */
	index: number

	/**
	 * A copy of the search string.
	 */
	input: pattern

	indices?: RegExpIndicesArray
}

export interface RegexExecArrayWithNamedCaptures<
	pattern extends string = string,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> extends BaseRegexExecArray<pattern, captures, namedCaptures> {
	groups: namedCaptures

	indices?: RegExpIndicesArray
}

interface RegExpIndicesArray extends Array<[number, number]> {
	groups?: {
		[key: string]: [number, number]
	}
}

export const regex = <src extends string, flags extends string = "">(
	src: regex.validate<src>,
	flags?: flags
): regex.parse<src, flags> => new RegExp(src, flags) as never

export type regex<
	pattern extends string = string,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> = Regex<pattern, captures, namedCaptures>

export declare namespace regex {
	export type parse<src extends string, flags extends string = ""> = parseState<
		State.initialize<src, flags>
	>

	export type infer<src extends string, flags extends string = ""> =
		parse<src, flags> extends Regex<infer pattern> ? pattern : never

	export type validate<src extends string, flags extends string = ""> =
		parse<src, flags> extends Regex<infer e extends ErrorMessage> ? e : src
}
