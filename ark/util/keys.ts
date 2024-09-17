import type { array, join } from "./arrays.ts"
import type { NonNegativeIntegerLiteral } from "./numericLiterals.ts"

export type Key = string | symbol

export type toArkKey<o, k extends keyof o> =
	k extends number ?
		[o, number] extends [array, k] ?
			NonNegativeIntegerLiteral
		:	`${k}`
	:	k

export type arkIndexableOf<o> =
	arkKeyOf<o> extends infer k ?
		k extends `${infer index extends number}` ?
			index | k
		:	k
	:	never

export type arkKeyOf<o> =
	[o] extends [object] ?
		[o] extends [array] ?
			arkArrayKeyOf<o>
		:	arkObjectLiteralKeyOf<o>
	:	never

type arkArrayKeyOf<a extends array> =
	number extends a["length"] ? NonNegativeIntegerLiteral
	: keyof a extends infer i ?
		i extends `${number}` ?
			i
		:	never
	:	never

type arkObjectLiteralKeyOf<o extends object> =
	keyof o extends infer k ?
		k extends number ?
			`${k}`
		:	k
	:	never

export type arkGet<o, k extends arkIndexableOf<o>> = o[k extends keyof o ? k
: NonNegativeIntegerLiteral extends k ? number & keyof o
: k extends number ? `${k}` & keyof o
: never]

export type writeInvalidKeysMessage<
	o extends string,
	keys extends array<string>
> = `Key${keys["length"] extends 1 ? "" : "s"} ${join<keys, ", ">} ${keys["length"] extends 1 ? "does" : "do"} not exist on ${o}`
