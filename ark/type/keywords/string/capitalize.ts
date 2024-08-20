import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type capitalized = constrain<string, Branded<"capitalized">>
}

export type capitalized = string.capitalized

export const capitalized = regexStringNode(/^\S(.+)$/, "capitalized")

export type capitalize = (In: string) => Out<string.capitalized>

export const capitalize = rootNode({
	in: "string",
	morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
})
