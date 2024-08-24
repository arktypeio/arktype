import { rootNode } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type uppercase = constrain<string, Branded<"uppercase">>
}

const preformatted = regexStringNode(/^[A-Z]*$/, "only uppercase letters")

export const upper: upper.module = submodule({
	$root: rootNode({
		in: "string",
		morphs: (s: string) => s.toUpperCase(),
		declaredOut: preformatted
	}),
	preformatted
})

export declare namespace upper {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		$root: (In: string) => To<string.uppercase>
		preformatted: string.uppercase
	}
}
