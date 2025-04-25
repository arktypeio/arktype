import type { ErrorMessage } from "@ark/util"
import type { parse } from "./parse.ts"
import type { s } from "./state.ts"

export type NonEmptyQuantifiable = [string, ...string[]]

export type quantifyBuiltin<
	quantifier extends BuiltinQuantifier,
	token extends NonEmptyQuantifiable
> =
	quantifier extends "?" ? [...token, ""]
	: quantifier extends "+" ? suffix<token, string>
	: quantifier extends "*" ? ["", ...suffix<token, string>]
	: never

export type quantify<
	quantifiable extends string[],
	quantifier extends string,
	min extends number,
	max extends number
> =
	quantifiable extends [] ? writeUnmatchedQuantifierError<quantifier>
	:	_loopUntilMin<quantifiable, min, max, [], { [i in keyof quantifiable]: "" }>

type _loopUntilMin<
	s extends string[],
	min extends number,
	max extends number,
	i extends 1[],
	repetitions extends string[]
> =
	i["length"] extends min ? _loopUntilMax<s, min, max, i, repetitions>
	:	_loopUntilMin<
			s,
			min,
			max,
			[...i, 1],
			{ [i in keyof s]: `${repetitions[i & keyof repetitions]}${s[i]}` }
		>

type _loopUntilMax<
	s extends string[],
	min extends number,
	max extends number,
	i extends 1[],
	repetitions extends string[]
> =
	i["length"] extends max ? repetitions
	:	[
			...repetitions,
			..._loopUntilMax<
				s,
				min,
				max,
				[...i, 1],
				{ [i in keyof s]: `${repetitions[i & keyof repetitions]}${s[i]}` }
			>
		]

export type BuiltinQuantifier = "*" | "+" | "?"

export type writeUnmatchedQuantifierError<quantifier extends string> =
	ErrorMessage<`Quantifier ${quantifier} requires a preceding token`>

type suffix<quantifiable extends string[], suffix extends string> = [
	...quantifiable,
	...{ [i in keyof quantifiable]: `${quantifiable[i]}${suffix}` }
]
