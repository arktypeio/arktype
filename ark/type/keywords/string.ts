import { ArkErrors, intrinsic, rootNode } from "@ark/schema"
import { wellFormedIntegerMatcher, wellFormedNumberMatcher } from "@ark/util"
import type { Out, string } from "../ast.ts"
import type { Module, Submodule } from "../module.ts"
import { scope } from "../scope.ts"
import { arkNumber } from "./number.ts"
import { creditCardMatcher, isLuhnValid } from "./utils/creditCard.ts"
import { iso8601Matcher } from "./utils/date.ts"
import { arkIp } from "./utils/ip.ts"
import { regexStringNode } from "./utils/regex.ts"
import { arkUuid } from "./utils/uuid.ts"

// Non-trivial expressions should have an explanation or attribution

const isParsableUrl = (s: string) => {
	if (URL.canParse as unknown) return URL.canParse(s)
	// Can be removed once Node 18 is EOL
	try {
		new URL(s)
		return true
	} catch {
		return false
	}
}

const isParsableJson = (s: string) => {
	try {
		JSON.parse(s)
		return true
	} catch {
		return false
	}
}

const url = rootNode({
	domain: "string",
	predicate: {
		meta: "a URL string",
		predicate: isParsableUrl
	}
})

const json = rootNode({
	domain: "string",
	predicate: {
		meta: "a JSON string",
		predicate: isParsableJson
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

// url: (In: string) => Out<URL>
// number: (In: string) => Out<number>
// integer: (In: string) => Out<number.divisibleBy<1>>
// date: (In: string) => Out<Date>
// json: (In: string) => Out<object>
// formData: (In: FormData) => Out<ParsedFormData>

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
		lower: regexStringNode(/^[a-z]*$/, "only lowercase letters"),
		upper: regexStringNode(/^[A-Z]*$/, "only uppercase letters"),
		iso8601,
		epoch,
		json,
		semver,
		ip: arkIp.submodule,
		creditCard,
		email,
		uuid: arkUuid.submodule,
		url,

		// formatting
		trim: rootNode({
			in: "string",
			morphs: (s: string) => s.trim()
		}),
		toUpper: rootNode({
			in: "string",
			morphs: (s: string) => s.toUpperCase()
		}),
		toLower: rootNode({
			in: "string",
			morphs: (s: string) => s.toLowerCase()
		}),
		capitalize: rootNode({
			in: "string",
			morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
		}),
		normalize: rootNode({
			in: "string",
			morphs: (s: string) => s.normalize()
		})
	},
	{
		prereducedAliases: true
	}
).export()

export const arkString = {
	submodule
}

export declare namespace arkString {
	export type submodule = Submodule<{
		$root: string
		alpha: string.narrowed
		alphanumeric: string.narrowed
		digits: string.narrowed
		lower: string.narrowed
		upper: string.narrowed
		numeric: string.narrowed
		integer: string.narrowed
		iso8601: string.narrowed
		epoch: string.narrowed
		creditCard: string.narrowed
		email: string.narrowed
		uuid: arkUuid.submodule
		url: string.narrowed
		semver: string.narrowed
		ip: arkIp.submodule

		// formatting
		trim: (In: string) => Out<string>
		toUpper: (In: string) => Out<string>
		toLower: (In: string) => Out<string>
		capitalize: (In: string) => Out<string>
		normalize: (In: string) => Out<string>
	}>
}
