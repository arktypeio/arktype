import { intrinsic, rootSchema, type TraversalContext } from "@ark/schema"
import { wellFormedIntegerMatcher } from "@ark/util"
import type { Nominal, of, To } from "../../attributes.ts"
import type { Module, Submodule } from "../../module.ts"
import type { number } from "../number/number.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type integer = of<string, Nominal<"integer">>
}

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
		root: string.integer
		parse: (In: string.integer) => To<number.divisibleBy<1>>
	}
}
