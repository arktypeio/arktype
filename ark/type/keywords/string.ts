import { ArkErrors, intrinsic, rootNode } from "@ark/schema"
import { wellFormedIntegerMatcher, wellFormedNumberMatcher } from "@ark/util"
import type { anonymous, string } from "../ast.ts"
import type { Module, Submodule } from "../module.ts"
import { scope } from "../scope.ts"
import { arkNumber } from "./number.ts"
import { creditCardMatcher, isLuhnValid } from "./utils/creditCard.ts"
import { iso8601Matcher } from "./utils/date.ts"
import { ip } from "./utils/ip.ts"
import { regexStringNode } from "./utils/regex.ts"

// Non-trivial expressions should have an explanation or attribution

const isValidUrl = (s: string) => {
	if (URL.canParse as unknown) return URL.canParse(s)
	// Can be removed once Node 18 is EOL
	try {
		new URL(s)
	} catch {
		return false
	}
	return true
}

const url = rootNode({
	domain: "string",
	predicate: {
		meta: "a valid URL",
		predicate: isValidUrl
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

const numericString = regexStringNode(
	wellFormedNumberMatcher,
	"a well-formed numeric string"
)

const integerString = regexStringNode(
	wellFormedIntegerMatcher,
	"a well-formed integer string"
)

const epoch = integerString
	.narrow((s, ctx) => {
		// we know this is safe since it has already
		// been validated as an integer string
		const n = Number.parseInt(s)
		const out = arkNumber.submodule.epoch(n)
		if (out instanceof ArkErrors) {
			ctx.errors.merge(out)
			return false
		}
		return true
	})
	.describe("an integer string representing a safe Unix timestamp")

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
		numeric: numericString,
		integer: integerString,
		iso8601,
		epoch,
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

	interface $ extends keywords {
		$root: string
		numeric: string.narrowed
		integer: string.narrowed
		iso8601: string.narrowed
		epoch: string.narrowed
	}

	export type submodule = Submodule<$>
}
