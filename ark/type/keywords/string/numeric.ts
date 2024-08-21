import { intrinsic, rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type numeric = constrain<string, Branded<"numeric">>
}

const $root = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

export const numeric = submodule({
	$root,
	parse: rootNode({
		in: $root,
		morphs: (s: string) => Number.parseFloat(s),
		declaredOut: intrinsic.number
	})
})

export type numeric = Submodule<{
	$root: string.numeric
	parse: (In: string.numeric) => To<number>
}>
