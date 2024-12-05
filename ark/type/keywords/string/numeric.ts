import { intrinsic, rootSchema } from "@ark/schema"
import { numericStringMatcher } from "@ark/util"
import type { To } from "../../attributes.ts"
import type { Module, Submodule } from "../../module.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

const root = regexStringNode(
	numericStringMatcher,
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
		root: string
		parse: (In: string) => To<number>
	}
}
