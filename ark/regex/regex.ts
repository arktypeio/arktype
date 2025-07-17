import type { ErrorMessage, inferred } from "@ark/util"
import type { RegexExecArray } from "./execArray.ts"
import type { parseState } from "./parse.ts"
import type { State } from "./state.ts"
import type { CapturesRegex } from "./variants/captures.ts"
import type { FlagsRegex } from "./variants/flags.ts"
import type { NamedCapturesRegex } from "./variants/namedCaptures.ts"
import type { PatternRegex } from "./variants/pattern.ts"

export type NamedCaptures = Record<string, string>

export type UnicodeFlag = "v" | "u"
export type Flags =
	`${"d" | ""}${"g" | ""}${"i" | ""}${"m" | ""}${"s" | ""}${UnicodeFlag | ""}${"y" | ""}`

export type Regex<
	pattern extends string = string,
	flags extends Flags = Flags,
	captures extends string[] = string[],
	namedCaptures extends NamedCaptures = NamedCaptures
> =
	captures extends [] ?
		flags extends "" ?
			PatternRegex<pattern>
		:	FlagsRegex<pattern, captures, flags>
	: [keyof namedCaptures] extends [never] ?
		flags extends "" ?
			CapturesRegex<pattern, captures>
		:	FlagsRegex<pattern, captures, flags>
	:	NamedCapturesRegex<pattern, flags, captures, namedCaptures>

export interface BaseRegex<
	out pattern extends string,
	out captures extends string[],
	out flags extends Flags,
	// @ts-ignore (override variance)
	out namedCaptures extends NamedCaptures
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

// TODO: fix regex group could be undefined if quantified by 0

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
