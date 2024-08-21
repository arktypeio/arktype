import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type preupper = constrain<string, Branded<"uppercase">>
}

export type upper = Submodule<{
	$root: (In: string) => Out<string.preupper>
	preformatted: string.preupper
}>

export const upper = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.toUpperCase()
	}),
	preformatted: regexStringNode(/^[A-Z]*$/, "only uppercase letters")
})
