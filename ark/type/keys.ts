import type {
	array,
	join,
	Key,
	NonNegativeIntegerLiteral,
	typeToString
} from "@ark/util"
import type { type } from "./ark.js"
import type { termOrType } from "./ast.js"

export type normalizeKey<o, k extends keyof o> =
	k extends number ?
		[o, number] extends [array, k] ?
			NonNegativeIntegerLiteral
		:	`${k}`
	:	k

export type keyOf<o> =
	[o] extends [array] ?
		| (number extends o["length"] ? NonNegativeIntegerLiteral : never)
		| {
				[k in keyof o]-?: k extends `${infer index extends number}` ? index | k
				:	never
		  }[keyof o & `${number}`]
	:	{
			[k in keyof o]: k extends number ? k | `${k}` : k
		}[keyof o]

export type getKey<o, k extends keyOf<o>> = o[Extract<
	k extends NonNegativeIntegerLiteral ? number : k,
	keyof o
>]

export type getPath<o, path extends array<PropertyKey>> = _getPath<o, path>

type _getPath<o, path extends array> =
	path extends readonly [infer k, ...infer tail] ?
		k extends keyOf<o> ?
			_getPath<getKey<o, k>, tail>
		:	undefined
	:	o

export type TypeKey = termOrType<Key>

export type typeKeyToString<k extends TypeKey> = typeToString<
	k extends type.cast<infer t> ? t : k
>

export type writeInvalidKeysMessage<
	o extends string,
	keys extends array<string>
> = `Key${keys["length"] extends 1 ? "" : "s"} ${join<keys, ", ">} ${keys["length"] extends 1 ? "does" : "do"} not exist on ${o}`
