import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../../ast.ts"
import { regexStringNode } from "./utils.ts"

namespace string {
	export type capitalize = constrain<string, Branded<"capitalized">>
}

export type capitalized = string.capitalize

export const capitalized = regexStringNode(/^\S(.+)$/, "capitalized")

export type toCapitalized = (In: string) => Out<string.capitalize>

export const toCapitalized = rootNode({
	in: "string",
	morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
})
