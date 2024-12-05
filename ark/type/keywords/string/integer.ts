import { intrinsic, rootSchema, type TraversalContext } from "@ark/schema"
import { wellFormedIntegerMatcher } from "@ark/util"
import type { To } from "../../attributes.ts"
import type { Module, Submodule } from "../../module.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

const root = regexStringNode(
	wellFormedIntegerMatcher,
	"a well-formed integer string"
)

export const integer: stringInteger.module = arkModule({
	root,
	parse: rootSchema({
		in: root,
		morphs: (s: string, ctx: TraversalContext) => {
			const parsed = Number.parseInt(s)
			return Number.isSafeInteger(parsed) ? parsed : (
					ctx.error(
						"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
					)
				)
		},
		declaredOut: intrinsic.integer
	})
})

export declare namespace stringInteger {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		parse: (In: string) => To<number>
	}
}
