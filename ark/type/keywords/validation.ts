import type { Module, Scope, rootResolutions } from "../scope.js"
import { root } from "./root.js"
import { creditCard } from "./utils/creditCard.js"

// Non-trivial expressions should have an explanation or attribution

const url = root.schema({
	domain: "string",
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

const email = root.schema({
	domain: "string",
	regex: emailMatcher,
	description: "a valid email"
})

const uuidMatcher =
	/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/

// https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js
const uuid = root.schema({
	domain: "string",
	regex: uuidMatcher,
	description: "a valid UUID"
})

const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// https://semver.org/
const semver = root.schema({
	domain: "string",
	regex: semverMatcher,
	description: "a valid semantic version (see https://semver.org/)"
})

const alpha = root.schema({
	domain: "string",
	regex: /^[A-Za-z]*$/,
	description: "only letters"
})

const alphanumeric = root.schema({
	domain: "string",
	regex: /^[A-Za-z\d]*$/,
	description: "only letters and digits"
})

const lowercase = root.schema({
	domain: "string",
	regex: /^[a-z]*$/,
	description: "only lowercase letters"
})

const uppercase = root.schema({
	domain: "string",
	regex: /^[A-Za-z]*$/,
	description: "only uppercase letters"
})

const integer = root.schema({
	domain: "number",
	divisor: 1,
	description: "an integer"
})

export namespace validation {
	export interface exports {
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

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof validation)["infer"]
}

export const validation: Scope<validation.resolutions> = root.scope(
	{
		alpha,
		alphanumeric,
		lowercase,
		uppercase,
		creditCard,
		email,
		uuid,
		url,
		semver,
		integer
	},
	{ prereducedAliases: true }
)

export const validationKeywords: Module<validation.resolutions> =
	validation.export()
