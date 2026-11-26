import type { ErrorMessage, inferred } from "@ark/util"
import type { RegexExecArray } from "./execArray.ts"
import type { parseState } from "./parse.ts"
import type { State } from "./state.ts"

export type IndexedCaptures = Array<string | undefined>
export type NamedCaptures = Record<string, string | undefined>

export type UnicodeFlag = "v" | "u"
export type Flag = "d" | "g" | "i" | "m" | "s" | UnicodeFlag | "y"
export type Flags =
	`${"d" | ""}${"g" | ""}${"i" | ""}${"m" | ""}${"s" | ""}${UnicodeFlag | ""}${"y" | ""}`

type canonicalFlags<seen extends Flag> =
	`${"d" extends seen ? "d" : ""}${"g" extends seen ? "g" : ""}${"i" extends seen ? "i" : ""}${"m" extends seen ? "m" : ""}${"s" extends seen ? "s" : ""}${"u" extends (
		seen
	) ?
		"u"
	: "v" extends seen ? "v"
	: ""}${"y" extends seen ? "y" : ""}`

type parseFlags<flags extends string, seen extends Flag = never> =
	flags extends "" ? canonicalFlags<seen>
	: flags extends `${infer f}${infer rest}` ?
		f extends Flag ?
			f extends seen ? ErrorMessage<writeDuplicateFlagMessage<f>>
			: f extends UnicodeFlag ?
				UnicodeFlag extends seen | f ?
					ErrorMessage<mutuallyExclusiveUnicodeFlagsMessage>
				:	parseFlags<rest, seen | f>
			:	parseFlags<rest, seen | f>
		:	ErrorMessage<writeInvalidFlagMessage<f>>
	:	Flags

export type normalizeFlags<flags extends string> =
	flags extends "" ? ""
	: parseFlags<flags> extends infer normalized extends Flags ? normalized
	: ""

export type validateFlags<flags extends string> =
	flags extends "" ? ""
	: string extends flags ? Flags
	: parseFlags<flags> extends infer e extends ErrorMessage ? e
	: flags

export const writeDuplicateFlagMessage = <flag extends Flag>(
	flag: flag
): writeDuplicateFlagMessage<flag> =>
	`Flag '${flag}' cannot be specified multiple times`

export type writeDuplicateFlagMessage<flag extends Flag> =
	`Flag '${flag}' cannot be specified multiple times`

export const writeInvalidFlagMessage = <flag extends string>(
	flag: flag
): writeInvalidFlagMessage<flag> =>
	`Flag '${flag}' must be one of 'd', 'g', 'i', 'm', 's', 'u', 'v' or 'y'`

export type writeInvalidFlagMessage<flag extends string> =
	`Flag '${flag}' must be one of 'd', 'g', 'i', 'm', 's', 'u', 'v' or 'y'`

export const mutuallyExclusiveUnicodeFlagsMessage =
	"Flags 'u' and 'v' cannot be used together"

export type mutuallyExclusiveUnicodeFlagsMessage =
	typeof mutuallyExclusiveUnicodeFlagsMessage

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
	inferExecArray: RegexExecArray<
		[pattern, ...this["inferCaptures"]],
		this["inferNamedCaptures"],
		this["flags"]
	>

	flags: ctx["flags"] extends Flags ? ctx["flags"] : ""

	test(s: string): s is pattern

	exec(s: string): this["inferExecArray"] | null
	// allow extension of base RegExp with more accurate types
	// since parameters are identical, this overload will never be hit
	exec(s: string): never
}

export interface RegexParser {
	<src extends string, flags extends string = "">(
		src: regex.validate<src, normalizeFlags<flags>>,
		flags?: validateFlags<flags>
	): regex.parse<src, flags>

	as: <pattern extends string = string, ctx extends RegexContext = {}>(
		src: string,
		flags?: Flags
	) => Regex<pattern, ctx>
}

export const regex: RegexParser = ((src, flags) =>
	new RegExp(src, flags)) as RegexParser

Object.assign(regex, { as: regex })

export type regex<
	pattern extends string = string,
	ctx extends RegexContext = RegexContext
> = Regex<pattern, ctx>

export declare namespace regex {
	export type infer<src extends string, flags extends string = ""> =
		parse<src, flags> extends Regex<infer pattern> ? pattern : never

	export type validate<src extends string, flags extends string = ""> =
		parse<src, flags> extends infer e extends ErrorMessage ? e : src

	export type parse<src extends string, flags extends string = ""> =
		flags extends "" ? parseState<State.initialize<src, "">>
		: parseFlags<flags> extends infer normalized extends Flags ?
			parseState<State.initialize<src, normalized>>
		:	parseFlags<flags>
}
