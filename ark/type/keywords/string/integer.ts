import { rootNode } from "@ark/schema"
import { wellFormedIntegerMatcher } from "@ark/util"
import type { Branded, constrain, number, Out } from "../../ast.ts"
import type { Submodule } from "../../module.ts"
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
		in: $root as never,
		morphs: (s: string, ctx) => {
			const parsed = Number.parseInt(s)
			return Number.isSafeInteger(parsed) ? parsed : (
					ctx.error(
						"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
					)
				)
		}
	})
})

export type integer = Submodule<{
	$root: string.integer
	parse: (In: string.integer) => Out<number.divisibleBy<1>>
}>
