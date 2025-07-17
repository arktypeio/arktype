import type { ErrorMessage, inferred } from "@ark/util"
import type { RegexExecArray } from "./execArray.ts"
import type { parseState } from "./parse.ts"
import type { State } from "./state.ts"

export type NamedCaptures = Record<string, string>

export type UnicodeFlag = "v" | "u"
export type Flags =
	`${"d" | ""}${"g" | ""}${"i" | ""}${"m" | ""}${"s" | ""}${UnicodeFlag | ""}${"y" | ""}`

export interface Regex<
	pattern extends string = string,
	flags extends Flags = Flags,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
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

declare const r: Regex<"foo", "d", ["bar"], { baz: "baz" }>

// TODO: fix regex group could be undefined if quantified by 0

const reg: RegExp = {} as Regex

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
