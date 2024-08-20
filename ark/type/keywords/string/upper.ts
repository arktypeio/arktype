import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type upper = constrain<string, Branded<"upper">>
}

export type upper = string.upper

export const upper = regexStringNode(/^[A-Z]*$/, "only uppercase letters")

export type toUpper = (In: string) => Out<string.upper>

export const toUpper = rootNode({
	in: "string",
	morphs: (s: string) => s.toUpperCase()
})
