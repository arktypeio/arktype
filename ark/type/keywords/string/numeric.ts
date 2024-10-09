import { intrinsic, rootSchema } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { Nominal, of, To } from "../inference.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type numeric = of<string, Nominal<"numeric">>
}

const root = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

export const numeric: stringNumeric.module = arkModule({
	root,
	parse: rootSchema({
		in: root,
		morphs: (s: string) => Number.parseFloat(s),
		declaredOut: intrinsic.number
	})
})

export declare namespace stringNumeric {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string.numeric
		parse: (In: string.numeric) => To<number>
	}
}
