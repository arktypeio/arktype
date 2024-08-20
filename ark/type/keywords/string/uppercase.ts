import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type upper = constrain<string, Branded<"uppercased">>
}

export type uppercased = string.upper

export const uppercased = regexStringNode(/^[A-Z]*$/, "only uppercase letters")

export type uppercase = (In: string) => Out<string.upper>

export const uppercase = rootNode({
	in: "string",
	morphs: (s: string) => s.toUpperCase()
})
