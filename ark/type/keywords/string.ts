import { wellFormedNumberMatcher } from "@ark/util"
import type { string } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { tsKeywordsModule } from "./tsKeywords.js"
import { regexStringNode } from "./utils/regex.js"

const numeric = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

export type stringExports = {
	$root: string
	numeric: string.narrowed
}

export type stringModule = Module<stringExports>

export const stringModule: stringModule = scope(
	{
		$root: tsKeywordsModule.string,
		numeric
	},
	{
		prereducedAliases: true
	}
).export()
