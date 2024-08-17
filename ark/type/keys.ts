import type {
	array,
	join,
	Key,
	NonNegativeIntegerLiteral,
	typeToString
} from "@ark/util"
import type { termOrType } from "./ast.ts"
import type { type } from "./keywords/ark.ts"

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

export type TypeKey = termOrType<Key>

export type typeKeyToString<k extends TypeKey> = typeToString<
	k extends type.cast<infer t> ? t : k
>

export type writeInvalidKeysMessage<
	o extends string,
	keys extends array<string>
> = `Key${keys["length"] extends 1 ? "" : "s"} ${join<keys, ", ">} ${keys["length"] extends 1 ? "does" : "do"} not exist on ${o}`
