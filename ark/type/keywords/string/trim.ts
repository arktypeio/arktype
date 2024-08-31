import { rootNode } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type trimmed = constrain<string, Branded<"trimmed">>
}

const preformatted = regexStringNode(
	// no leading or trailing whitespace
	/^\S.*\S$|^\S?$/,
	"trimmed"
)

export const trim: trim.module = submodule({
	root: rootNode({
		in: "string",
		morphs: (s: string) => s.trim(),
		declaredOut: preformatted
	}),
	preformatted
})

export declare namespace trim {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string.trimmed>
		preformatted: string.trimmed
	}
}
