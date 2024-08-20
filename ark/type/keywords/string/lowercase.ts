import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type lowercased = constrain<string, Branded<"lowercased">>
}

export const lowercased = regexStringNode(/^[a-z]*$/, "only lowercased letters")

export type lowercased = string.lowercased

export type lowercase = (In: string) => Out<string.lowercased>

export const lowercase = rootNode({
	in: "string",
	morphs: (s: string) => s.toLowerCase()
})
