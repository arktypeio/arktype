import { rootNode } from "@ark/schema"
import type { string } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { iso8601Matcher } from "./utils/date.js"
import { regexStringNode } from "./utils/regex.js"

/**
 * As per the ECMA-262 specification:
 * A time value supports a slightly smaller range of -8,640,000,000,000,000 to 8,640,000,000,000,000 milliseconds.
 *
 * @see https://262.ecma-international.org/15.0/index.html#sec-time-values-and-time-range
 */
export const unixTimestampNumber = rootNode({
	domain: {
		domain: "number",
		meta: "a number representing a Unix timestamp"
	},
	divisor: {
		rule: 1,
		meta: `an integer representing a Unix timestamp`
	},
	min: {
		rule: -8640000000000000,
		meta: `a Unix timestamp after -8640000000000000`
	},
	max: {
		rule: 8640000000000000,
		meta: "a Unix timestamp before 8640000000000000"
	},
	meta: "an integer representing a safe Unix timestamp"
})

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

export interface datetimeExports {
	iso8601: string.narrowed
	unix: string.narrowed
}

export type datetimeModule = Module<datetimeExports>

export const datetimeModule: datetimeModule = scope(
	{
		iso8601,
		unix
	},
	{ prereducedAliases: true }
).export()
