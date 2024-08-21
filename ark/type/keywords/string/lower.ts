import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type lowercase = constrain<string, Branded<"lowercase">>
}

export type lower = Submodule<{
	$root: (In: string) => To<string.lowercase>
	preformatted: string.lowercase
}>

const preformatted = regexStringNode(/^[a-z]*$/, "only lowercase letters")

export const lower = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.toLowerCase(),
		declaredOut: preformatted
	}),
	preformatted
})
