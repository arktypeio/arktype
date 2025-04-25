import type { ErrorMessage, inferred } from "@ark/util"
import type { parse } from "./parse.ts"
import type { s, State } from "./state.ts"

export interface Regex<pattern extends string = string> extends RegExp {
	[inferred]: pattern
	infer: pattern

	test(s: string): s is pattern
}

export const regex = <src extends string>(
	src: regex.validate<src>
): Regex<regex.infer<src>> => new RegExp(src) as never

export type regex<pattern extends string = string> = Regex<pattern>

export declare namespace regex {
	export type infer<src extends string> = parse<State.initialize<src>>

	export type validate<src extends string> =
		regex.infer<src> extends ErrorMessage ? regex.infer<src> : src
}
