import type { array, NonNegativeIntegerLiteral } from "@ark/util"

export type toArkKey<o, k extends keyof o> =
	k extends number ?
		[o, number] extends [array, k] ?
			NonNegativeIntegerLiteral
		:	`${k}`
	:	k

export type arkKeyOf<o> =
	o extends array ?
		| (number extends o["length"] ? NonNegativeIntegerLiteral : never)
		| {
				[k in keyof o]-?: k extends `${infer index extends number}` ? index | k
				:	never
		  }[keyof o & `${number}`]
	:	{
			[k in keyof o]: k extends number ? k | `${k}` : k
		}[keyof o]

export type getArkKey<o, k extends arkKeyOf<o>> = o[Extract<
	k extends NonNegativeIntegerLiteral ? number : k,
	keyof o
>]
