import { intrinsic, rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"
import type { anonymous, inferred, string } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
import { creditCardMatcher, isLuhnValid } from "./utils/creditCard.js"
import { iso8601Matcher } from "./utils/date.js"
import { ip } from "./utils/ip.js"
import { regexStringNode } from "./utils/regex.js"
// Non-trivial expressions should have an explanation or attribution

const url = rootNode({
	domain: "string",
	predicate: {
		meta: "a valid URL",
		predicate: (s: string) => {
			try {
				new URL(s)
			} catch {
				return false
			}
			return true
		}
	}
})

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const email = regexStringNode(emailMatcher, "a valid email")

const uuidMatcher =
	/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = regexStringNode(uuidMatcher, "a valid UUID")

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
const semver = regexStringNode(
	semverMatcher,
	"a valid semantic version (see https://semver.org/)"
)

const creditCard = rootNode({
	domain: "string",
	pattern: {
		meta: "a valid credit card number",
		rule: creditCardMatcher.source
	},
	predicate: {
		meta: "a valid credit card number",
		predicate: isLuhnValid
	}
})

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
	"an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date"
)

const keywords: Module<arkString.keywords> = scope(
	{
		alpha: regexStringNode(/^[A-Za-z]*$/, "only letters"),
		alphanumeric: regexStringNode(
			/^[A-Za-z\d]*$/,
			"only letters and digits 0-9"
		),
		digits: regexStringNode(/^\d*$/, "only digits 0-9"),
		lowercase: regexStringNode(/^[a-z]*$/, "only lowercase letters"),
		uppercase: regexStringNode(/^[A-Z]*$/, "only uppercase letters"),
		creditCard,
		email,
		uuid,
		url,
		semver,
		ip
	},
	{ prereducedAliases: true }
).export()

const submodule: Module<arkString.submodule> = scope(
	{
		$root: intrinsic.string,
		numeric,
		iso8601,
		unix,
		...keywords
	},
	{
		prereducedAliases: true
	}
).export()

export const arkString = {
	keywords,
	submodule
}

export declare namespace arkString {
	export interface keywords {
		alpha: string.matching<anonymous>
		alphanumeric: string.matching<anonymous>
		digits: string.matching<anonymous>
		lowercase: string.matching<anonymous>
		uppercase: string.matching<anonymous>
		creditCard: string.matching<anonymous>
		email: string.matching<anonymous>
		uuid: string.matching<anonymous>
		url: string.matching<anonymous>
		semver: string.matching<anonymous>
		ip: string.matching<anonymous>
	}

	export interface submodule extends keywords {
		$root: string
		[inferred]: string
		numeric: string.narrowed
		iso8601: string.narrowed
		unix: string.narrowed
	}
}
