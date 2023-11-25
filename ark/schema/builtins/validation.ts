import type { Schema } from "../schema.js"
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

export interface ValidationSchemas {
	alpha: Schema<"intersection", string>
	alphanumeric: Schema<"intersection", string>
	lowercase: Schema<"intersection", string>
	uppercase: Schema<"intersection", string>
	creditCard: Schema<"intersection", string>
	email: Schema<"intersection", string>
	uuid: Schema<"intersection", string>
	url: Schema<"intersection", string>
	semver: Schema<"intersection", string>
	integer: Schema<"intersection", number>
}

// SchemaScope<ValidationSchemas>
export const validation = SchemaScope.from({
	alpha: {
		basis: "string",
		pattern: /^[A-Za-z]*$/,
		description: "only letters"
	},
	alphanumeric: {
		basis: "string",
		pattern: /^[A-Za-z\d]*$/,
		description: "only letters and digits"
	},
	lowercase: {
		basis: "string",
		pattern: /^[a-z]*$/,
		description: "only lowercase letters"
	},
	uppercase: {
		basis: "string",
		pattern: /^[A-Za-z]*$/,
		description: "only uppercase letters"
	},
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
