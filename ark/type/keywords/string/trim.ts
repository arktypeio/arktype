import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type trimmed = constrain<string, Branded<"trimmed">>
}

export type trimmed = string.trimmed

export const trimmed = regexStringNode(
	// no leading or trailing whitespace
	/^\S.*\S$|^\S?$/,
	"trimmed"
)

export type trim = (In: string) => Out<string.trimmed>

export const trim = rootNode({
	in: "string",
	morphs: (s: string) => s.trim()
})
