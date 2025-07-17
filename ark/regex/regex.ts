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

export const regex = <src extends string, flags extends Flags = "">(
	src: regex.validate<src, flags>,
	flags?: flags
): regex.instantiate<src, flags> => new RegExp(src, flags) as never

export type regex<
	pattern extends string = string,
	flags extends Flags = Flags,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> = Regex<pattern, flags, captures, namedCaptures>

export declare namespace regex {
	export type instantiate<src extends string, flags extends Flags = ""> =
		parse<src, flags> extends infer s extends State.Finalized ?
			Regex<s["pattern"], flags, s["captures"], s["namedCaptures"]>
		:	Regex

	export type infer<src extends string, flags extends Flags = ""> =
		parse<src, flags> extends infer s extends State.Finalized ? s["pattern"]
		:	never

	export type validate<src extends string, flags extends Flags = ""> =
		parse<src, flags> extends infer e extends ErrorMessage ? e : src

	export type parse<src extends string, flags extends Flags = ""> = parseState<
		State.initialize<src, flags>
	>
}
