import { ArkErrors, intrinsic, rootNode } from "@ark/schema"
import { wellFormedIntegerMatcher, wellFormedNumberMatcher } from "@ark/util"
import type { string } from "../ast.ts"
import type { Module, Submodule } from "../module.ts"
import { scope } from "../scope.ts"
import { arkNumber } from "./number.ts"
import { creditCardMatcher, isLuhnValid } from "./utils/creditCard.ts"
import { iso8601Matcher } from "./utils/date.ts"
import { arkIp } from "./utils/ip.ts"
import { regexStringNode } from "./utils/regex.ts"
import { arkUuid } from "./utils/uuid.ts"

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
		meta: "a URL",
		predicate: isValidUrl
	}
})

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const email = regexStringNode(emailMatcher, "an email address")

// https://semver.org/
const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const semver = regexStringNode(
	semverMatcher,
	"a semantic version (see https://semver.org/)"
)

const creditCard = rootNode({
	domain: "string",
	pattern: {
		meta: "a credit card number",
		rule: creditCardMatcher.source
	},
	predicate: {
		meta: "a credit card number",
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
		creditCard,
		email,
		uuid: arkUuid.submodule,
		url,
		semver,
		ip: arkIp.submodule
	},
	{ prereducedAliases: true }
).export()

const submodule: Module<arkString.submodule> = scope(
	{
		$root: intrinsic.string,
		numeric: numericString,
		integer: integerString,
		alpha: regexStringNode(/^[A-Za-z]*$/, "only letters"),
		alphanumeric: regexStringNode(
			/^[A-Za-z\d]*$/,
			"only letters and digits 0-9"
		),
		digits: regexStringNode(/^\d*$/, "only digits 0-9"),
		lowercase: regexStringNode(/^[a-z]*$/, "only lowercase letters"),
		uppercase: regexStringNode(/^[A-Z]*$/, "only uppercase letters"),
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
		creditCard: string.matching<"?">
		email: string.matching<"?">
		uuid: arkUuid.submodule
		url: string.matching<"?">
		semver: string.matching<"?">
		ip: arkIp.submodule
	}

	interface $ extends keywords {
		$root: string
		alpha: string.matching<"?">
		alphanumeric: string.matching<"?">
		digits: string.matching<"?">
		lower: string.matching<"?">
		upper: string.matching<"?">
		numeric: string.narrowed
		integer: string.narrowed
		iso8601: string.narrowed
		epoch: string.narrowed
	}

	export type submodule = Submodule<$>
}
