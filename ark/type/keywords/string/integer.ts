import { rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { Branded, constrain, Out } from "../../ast.ts"
import type { Submodule } from "../../module.ts"
import { scope } from "../../scope.ts"
import { regexStringNode } from "./utils.ts"

namespace string {
	export type integer = constrain<string, Branded<"integer">>
}

const $root = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

const submodule = scope(
	{
		$root,
		parse: rootNode({
			in: $root as never,
			morphs: (s: string) => Number.parseFloat(s)
		})
	},
	{ prereducedAliases: true }
).export()

export const numeric = {
	submodule
}

export declare namespace numeric {
	export type submodule = Submodule<{
		$root: string.integer
		parse: (In: string.integer) => Out<number.divisibleBy<1>>
	}>
}

const integer = rootNode({
	in: arkString.submodule.integer as never,
	morphs: (s: string, ctx) => {
		if (!isWellFormedInteger(s))
			return ctx.error("a well-formed integer string")

		const parsed = Number.parseInt(s)
		return Number.isSafeInteger(parsed) ? parsed : (
				ctx.error(
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
				)
			)
	}
})
