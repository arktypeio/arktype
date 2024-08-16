import { rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { string } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { tsKeywordsModule } from "./tsKeywords.js"
import { iso8601Matcher } from "./utils/date.js"
import { regexStringNode } from "./utils/regex.js"

const numeric = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

const unix = rootNode({
	domain: "string",
	// predicate: (s: string) => {
	// 	return true
	// },
	meta: "an integer string representing a safe Unix timestamp"
})

const iso8601 = regexStringNode(
	iso8601Matcher,
	"An ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date"
)

export type stringExports = {
	$root: string
	numeric: string.narrowed
	iso8601: string.narrowed
	unix: string.narrowed
}

export type stringModule = Module<stringExports>

export const stringModule: stringModule = scope(
	{
		$root: tsKeywordsModule.string,
		numeric,
		iso8601,
		unix
	},
	{
		prereducedAliases: true
	}
).export()
