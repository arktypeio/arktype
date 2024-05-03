import type { RootModule } from "../module.js"
import { root, schemaScope } from "../scope.js"
import { creditCard } from "./utils/creditCard.js"

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

const email = root.defineRoot({
	domain: "string",
	regex: {
		rule: emailMatcher.source,
		description: "a valid email"
	}
})

const uuidMatcher =
	/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = root.defineRoot({
	domain: "string",
	regex: {
		rule: uuidMatcher.source,
		description: "a valid UUID"
	}
})

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
const semver = root.defineRoot({
	domain: "string",
	regex: {
		rule: semverMatcher.source,
		description: "a valid semantic version (see https://semver.org/)"
	}
})

export interface validationExports {
	alpha: string
	alphanumeric: string
	lowercase: string
	uppercase: string
	creditCard: string
	email: string
	uuid: string
	url: string
	semver: string
	integer: number
}

export type validation = RootModule<validationExports>

export const validation: validation = schemaScope(
	{
		alpha: {
			domain: "string",
			regex: /^[A-Za-z]*$/,
			description: "only letters"
		},
		alphanumeric: {
			domain: "string",
			regex: {
				rule: /^[A-Za-z\d]*$/.source,
				description: "only letters and digits"
			}
		},
		lowercase: {
			domain: "string",
			regex: {
				rule: /^[a-z]*$/.source,
				description: "only lowercase letters"
			}
		},
		uppercase: {
			domain: "string",
			regex: {
				rule: /^[A-Za-z]*$/.source,
				description: "only uppercase letters"
			}
		},
		creditCard,
		email,
		uuid,
		url,
		semver,
		integer: {
			domain: "number",
			divisor: 1
		}
	},
	{ prereducedAliases: true }
).export()
