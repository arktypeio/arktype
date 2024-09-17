import type { array, join } from "./arrays.ts"
import type { NonNegativeIntegerLiteral } from "./numericLiterals.ts"

export type Key = string | symbol

export type toArkKey<o, k extends keyof o> =
	k extends number ?
		[o, number] extends [array, k] ?
			NonNegativeIntegerLiteral
		:	`${k}`
	:	k

export type arkKeyOf<o> =
	[o] extends [array] ?
		| (number extends o["length"] ? NonNegativeIntegerLiteral : never)
		| keyof {
				[k in keyof o as k extends `${infer index extends number}` ? index | k
				:	never]: never
		  }
	:	keyof {
			[k in keyof o as k extends number ? k | `${k}` : k]: never
		}

export type arkGet<o, k extends arkKeyOf<o>> = o[Extract<
	k extends NonNegativeIntegerLiteral ? number : k,
	keyof o
>]

export type writeInvalidKeysMessage<
	o extends string,
	keys extends array<string>
> = `Key${keys["length"] extends 1 ? "" : "s"} ${join<keys, ", ">} ${keys["length"] extends 1 ? "does" : "do"} not exist on ${o}`
