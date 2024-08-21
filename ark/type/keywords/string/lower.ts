import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type lower = constrain<string, Branded<"lowercase">>
}

export type lower = Submodule<{
	$root: (In: string) => Out<string.lower>
	preformatted: string.lower
}>

export const lower = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.toLowerCase()
	}),
	preformatted: regexStringNode(/^[a-z]*$/, "only lowercase letters")
})
