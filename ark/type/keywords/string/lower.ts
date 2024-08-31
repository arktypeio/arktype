import { rootNode } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type lowercase = constrain<string, Branded<"lowercase">>
}

const preformatted = regexStringNode(/^[a-z]*$/, "only lowercase letters")

export const lower: lower.module = submodule({
	root: rootNode({
		in: "string",
		morphs: (s: string) => s.toLowerCase(),
		declaredOut: preformatted
	}),
	preformatted
})

export declare namespace lower {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string.lowercase>
		preformatted: string.lowercase
	}
}
