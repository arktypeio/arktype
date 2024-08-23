import { intrinsic, rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
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

export const numeric: stringNumeric.module = submodule({
	$root,
	parse: rootNode({
		in: $root,
		morphs: (s: string) => Number.parseFloat(s),
		declaredOut: intrinsic.number
	})
})

export declare namespace stringNumeric {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		$root: string.numeric
		parse: (In: string.numeric) => To<number>
	}

	export type deepResolutions = {
		[k in keyof $ as `string.numeric.${k}`]: $[k]
	}
}
