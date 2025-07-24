import type { ErrorMessage, inferred } from "@ark/util"
import type { RegexExecArray } from "./execArray.ts"
import type { parseState } from "./parse.ts"
import type { State } from "./state.ts"

export type IndexedCaptures = Array<string | undefined>
export type NamedCaptures = Record<string, string>

export type UnicodeFlag = "v" | "u"
export type Flags =
	`${"d" | ""}${"g" | ""}${"i" | ""}${"m" | ""}${"s" | ""}${UnicodeFlag | ""}${"y" | ""}`

export type RegexContext = {
	flags?: Flags
	captures?: IndexedCaptures
	names?: NamedCaptures
}

export interface Regex<
	out pattern extends string = string,
	// @ts-ignore (override variance)
	out ctx extends RegexContext = RegexContext
> extends RegExp {
	[inferred]: pattern
	infer: pattern
	inferCaptures: ctx["captures"] extends IndexedCaptures ? ctx["captures"] : []
	inferNamedCaptures: ctx["names"] extends NamedCaptures ? ctx["names"] : {}

	flags: ctx["flags"] extends Flags ? ctx["flags"] : ""

	test(s: string): s is pattern

	exec(
		s: string
	): RegexExecArray<
		[pattern, ...this["inferCaptures"]],
		this["inferNamedCaptures"],
		this["flags"]
	> | null
	exec(s: string): never
}

export const regex = <src extends string, flags extends Flags = "">(
	src: regex.validate<src, flags>,
	flags?: flags
): regex.parse<src, flags> => new RegExp(src, flags) as never

export type regex<
	pattern extends string = string,
	ctx extends RegexContext = RegexContext
> = Regex<pattern, ctx>

export declare namespace regex {
	export type infer<src extends string, flags extends Flags = ""> =
		parse<src, flags> extends Regex<infer pattern> ? pattern : never

	export type validate<src extends string, flags extends Flags = ""> =
		parse<src, flags> extends infer e extends ErrorMessage ? e : src

	export type parse<src extends string, flags extends Flags = ""> = parseState<
		State.initialize<src, flags>
	>
}
