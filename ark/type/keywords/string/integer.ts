import { intrinsic, rootNode } from "@ark/schema"
import { wellFormedIntegerMatcher } from "@ark/util"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import type { number } from "../number/number.ts"
import { submodule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type integer = constrain<string, Branded<"integer">>
}

const $root = regexStringNode(
	wellFormedIntegerMatcher,
	"a well-formed integer string"
)

export const integer = submodule({
	$root,
	parse: rootNode({
		in: $root,
		morphs: (s: string, ctx) => {
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

export type integer = Submodule<{
	$root: string.integer
	parse: (In: string.integer) => To<number.divisibleBy<1>>
}>
