import type { ErrorMessage, inferred } from "@ark/util"
import type { parseState } from "./parse.ts"
import type { State, s } from "./state.ts"

export interface Regex<pattern extends string = string, groups = {}>
	extends RegExp {
	[inferred]: pattern
	infer: pattern
	inferGroups: groups

	test(s: string): s is pattern
}

export const regex = <src extends string>(
	src: regex.validate<src>
): regex.parse<src> => new RegExp(src) as never

export type regex<pattern extends string = string> = Regex<pattern>

export declare namespace regex {
	export type parse<src extends string> = parseState<State.initialize<src>>

	export type infer<src extends string> =
		parse<src> extends Regex<infer pattern> ? pattern : never

	export type validate<src extends string> =
		parse<src> extends Regex<infer e extends ErrorMessage> ? e : src
}
