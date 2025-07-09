// @ts-nocheck
import type { DynamicBase, ErrorMessage, inferred } from "@ark/util"
import type { parseState } from "./parse.ts"
import type { State } from "./state.ts"

export interface Regex<
	pattern extends string = string,
	groups extends Record<string | number, string> = {}
> extends RegExp {
	[inferred]: pattern
	infer: pattern
	inferGroups: groups

	test(s: string): s is pattern
	exec(s: string): groups | null
}

export interface RegexExecArray<
	captures extends string[],
	names extends Record<string, string>
> extends DynamicBase<captures> {
	/**
	 * The index of the search at which the result was found.
	 */
	index: number

	/**
	 * A copy of the search string.
	 */
	input: string

	/**
	 * The first match. This will always be present because `null` will be returned if there are no matches.
	 */
	0: string

	groups:
		| {
				[key: string]: string
		  }
		| undefined

	indices?: RegExpIndicesArray
}

interface RegExpIndicesArray extends Array<[number, number]> {
	groups:
		| {
				[key: string]: [number, number]
		  }
		| undefined
}

export const regex = <src extends string, flags extends string = "">(
	src: regex.validate<src>,
	flags?: flags
): regex.parse<src, flags> => new RegExp(src, flags) as never

export type regex<
	pattern extends string = string,
	groups extends Record<string | number, string> = {}
> = Regex<pattern, groups>

export declare namespace regex {
	export type parse<src extends string, flags extends string = ""> = parseState<
		State.initialize<src, flags>
	>

	export type infer<src extends string, flags extends string = ""> =
		parse<src, flags> extends Regex<infer pattern> ? pattern : never

	export type validate<src extends string, flags extends string = ""> =
		parse<src, flags> extends Regex<infer e extends ErrorMessage> ? e : src
}

const r = regex("^(foo)-(?<kmo>fooobar)$")

// apply transform to derive the type of capture groups

// A (current)
type a = Regex<
	"foo-fooobar",
	{
		1: "foo"
		2: "fooobar"
		kmo: "fooobar"
	}
>

// B
type B = Regex<
	"foo-fooobar",
	["foo", "foobar"],
	{
		kmo: "fooobar"
	}
>
