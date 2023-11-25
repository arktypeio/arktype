import { SchemaScope, rootSchema } from "../scope.js"
import { creditCard } from "./utils/creditCard.js"

// Non-trivial expressions should have an explanation or attribution

const url = rootSchema({
	basis: "string",
	predicate: (s: string) => {
		try {
			new URL(s)
		} catch {
			return false
		}
		return true
	},
	description: "a valid URL"
})

// https://www.regular-expressions.info/email.html
const emailMatcher = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const email = rootSchema({
	basis: "string",
	pattern: emailMatcher,
	description: "a valid email"
})

const uuidMatcher =
	/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = rootSchema({
	basis: "string",
	pattern: uuidMatcher,
	description: "a valid UUID"
})

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
const semver = rootSchema({
	basis: "string",
	pattern: semverMatcher,
	description: "a valid semantic version (see https://semver.org/)"
})

export interface InferredValidation {
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

export const validation: SchemaScope<InferredValidation> = SchemaScope.from({
	// Character sets
	// alpha: [/^[A-Za-z]*$/, "@", "only letters"],
	// alphanumeric: [/^[A-Za-z\d]*$/, "@", "only letters and digits"],
	// lowercase: [/^[a-z]*$/, "@", "only lowercase letters"],
	// uppercase: [/^[A-Z]*$/, "@", "only uppercase letters"],
	creditCard,
	email,
	uuid,
	url,
	semver,
	integer: {
		basis: "number",
		divisor: 1,
		description: "an integer"
	}
})
