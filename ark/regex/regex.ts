import type { ErrorMessage, inferred } from "@ark/util"
import type { loop } from "./parse.ts"
import type { State } from "./state.ts"

export interface Regex<pattern extends string = string, groups = {}>
	extends RegExp {
	[inferred]: pattern
	infer: pattern

	test(s: string): s is pattern
}

export const regex = <src extends string>(
	src: regex.validate<src>
): Regex<regex.infer<src>> => new RegExp(src) as never

export type regex<pattern extends string = string> = Regex<pattern>

export declare namespace regex {
	export type parse<src extends string> = loop<State.initialize<src>>

	export type infer<src extends string> =
		parse<src> extends Regex<infer pattern> ? pattern : never

	export type validate<src extends string> =
		parse<src> extends Regex<infer pattern> ?
			pattern extends ErrorMessage ?
				pattern
			:	src
		:	never
}
