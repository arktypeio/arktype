import type { anonymous, number, string } from "../ast.js"
import type { SchemaModule } from "../module.js"
import { root, schemaScope } from "../scope.js"
import { creditCardMatcher, isLuhnValid } from "./utils/creditCard.js"
import { ip } from "./utils/ip.js"
import { defineRegex } from "./utils/regex.js"

// Non-trivial expressions should have an explanation or attribution

const url = root.defineRoot({
	domain: "string",
	predicate: {
		predicate: (s: string) => {
			try {
				new URL(s)
			} catch {
				return false
			}
			return true
		},
		description: "a valid URL"
	}
})

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const email = defineRegex(emailMatcher, "a valid email")

const uuidMatcher =
	/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = defineRegex(uuidMatcher, "a valid UUID")

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
const semver = defineRegex(
	semverMatcher,
	"a valid semantic version (see https://semver.org/)"
)

const creditCard = root.defineRoot({
	domain: "string",
	pattern: {
		rule: creditCardMatcher.source,
		description: "a valid credit card number"
	},
	predicate: {
		predicate: isLuhnValid,
		description: "a valid credit card number"
	}
})

export interface validationExports {
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
	integer: number.divisibleBy<1>
}

export type validation = SchemaModule<validationExports>

export const validation: validation = schemaScope(
	{
		alpha: defineRegex(/^[A-Za-z]*$/, "only letters"),
		alphanumeric: defineRegex(/^[A-Za-z\d]*$/, "only letters and digits 0-9"),
		digits: defineRegex(/^\d*$/, "only digits 0-9"),
		lowercase: defineRegex(/^[a-z]*$/, "only lowercase letters"),
		uppercase: defineRegex(/^[A-Z]*$/, "only uppercase letters"),
		creditCard,
		email,
		uuid,
		url,
		semver,
		ip,
		integer: {
			domain: "number",
			divisor: 1
		}
	},
	{ prereducedAliases: true }
).export()
