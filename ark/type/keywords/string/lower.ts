import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type lower = constrain<string, Branded<"lower">>
}

export const lower = regexStringNode(/^[a-z]*$/, "only lower letters")

export type lower = string.lower

export type toLower = (In: string) => Out<string.lower>

export const toLower = rootNode({
	in: "string",
	morphs: (s: string) => s.toLowerCase()
})
