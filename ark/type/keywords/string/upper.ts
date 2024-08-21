import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type uppercase = constrain<string, Branded<"uppercase">>
}

export type upper = Submodule<{
	$root: (In: string) => To<string.uppercase>
	preformatted: string.uppercase
}>

const preformatted = regexStringNode(/^[A-Z]*$/, "only uppercase letters")

export const upper = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.toUpperCase(),
		declaredOut: preformatted
	}),
	preformatted
})
