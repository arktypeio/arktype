import { rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { Branded, constrain, Out } from "../../ast.ts"
import type { Submodule } from "../../module.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

namespace string {
	export type numeric = constrain<string, Branded<"numeric">>
}

const $root = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

export const numeric = submodule({
	$root,
	parse: rootNode({
		in: $root as never,
		morphs: (s: string) => Number.parseFloat(s)
	})
})

export type numeric = Submodule<{
	$root: string.numeric
	parse: (In: string.numeric) => Out<number>
}>
