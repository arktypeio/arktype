import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type trimmed = constrain<string, Branded<"trimmed">>
}

export type trim = Submodule<{
	$root: (In: string) => Out<string.trimmed>
	preformatted: string.trimmed
}>

export const trim = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.trim()
	}),
	preformatted: regexStringNode(
		// no leading or trailing whitespace
		/^\S.*\S$|^\S?$/,
		"trimmed"
	)
})
