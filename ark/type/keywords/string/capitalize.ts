import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type capitalized = constrain<string, Branded<"capitalized">>
}

export type capitalize = Submodule<{
	$root: (In: string) => To<string.capitalized>
	preformatted: string.capitalized
}>

const preformatted = regexStringNode(/^[A-Z].*$/, "capitalized")

export const capitalize = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
		declaredOut: preformatted
	}),
	preformatted
})
