import type { array, join, Key, typeToString } from "@ark/util"
import type { type } from "./ark.js"
import type { termOrType } from "./ast.js"

export type TypeKey = termOrType<Key>

export type typeKeyToString<k extends TypeKey> = typeToString<
	k extends type.cast<infer t> ? t : k
>

export type writeInvalidKeysMessage<
	o extends string,
	keys extends array<string>
> = `Key${keys["length"] extends 1 ? "" : "s"} ${join<keys, ", ">} ${keys["length"] extends 1 ? "does" : "do"} not exist on ${o}`
