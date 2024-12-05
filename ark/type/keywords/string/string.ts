import { intrinsic, rootSchema } from "@ark/schema"
import type { To } from "../../attributes.ts"
import type { Module, Submodule } from "../../module.ts"
import { arkModule } from "../utils.ts"
import { creditCard } from "./creditCard.ts"
import { stringDate } from "./date.ts"
import { integer, type stringInteger } from "./integer.ts"
import { ip } from "./ip.ts"
import { json, type stringJson } from "./json.ts"
import { normalize } from "./normalize.ts"
import { numeric, type stringNumeric } from "./numeric.ts"
import { url } from "./url.ts"
import { regexStringNode } from "./utils.ts"
import { uuid } from "./uuid.ts"

const base64 = arkModule({
	root: regexStringNode(
		/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
		"base64-encoded"
	),
	url: regexStringNode(
		/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==|%3D%3D)?|[A-Za-z0-9_-]{3}(?:=|%3D)?)?$/,
		"base64url-encoded"
	)
})

declare namespace base64 {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		url: string
	}
}

const preformattedCapitalize = regexStringNode(/^[A-Z].*$/, "capitalized")

export const capitalize: capitalize.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
		declaredOut: preformattedCapitalize
	}),
	preformatted: preformattedCapitalize
})

export declare namespace capitalize {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

const email = regexStringNode(
	// https://www.regular-expressions.info/email.html
	/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
	"an email address"
)

const preformattedLower = regexStringNode(/^[a-z]*$/, "only lowercase letters")

const lower: lower.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.toLowerCase(),
		declaredOut: preformattedLower
	}),
	preformatted: preformattedLower
})

export declare namespace lower {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

// https://semver.org/
const semverMatcher =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const semver = regexStringNode(
	semverMatcher,
	"a semantic version (see https://semver.org/)"
)

const preformattedTrim = regexStringNode(
	// no leading or trailing whitespace
	/^\S.*\S$|^\S?$/,
	"trimmed"
)

const trim: trim.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.trim(),
		declaredOut: preformattedTrim
	}),
	preformatted: preformattedTrim
})

export declare namespace trim {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

const preformattedUpper = regexStringNode(/^[A-Z]*$/, "only uppercase letters")

const upper: upper.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.toUpperCase(),
		declaredOut: preformattedUpper
	}),
	preformatted: preformattedUpper
})

declare namespace upper {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string>
		preformatted: string
	}
}

export const string = arkModule({
	root: intrinsic.string,
	alpha: regexStringNode(/^[A-Za-z]*$/, "only letters"),
	alphanumeric: regexStringNode(/^[A-Za-z\d]*$/, "only letters and digits 0-9"),
	base64,
	capitalize,
	creditCard,
	date: stringDate,
	digits: regexStringNode(/^\d*$/, "only digits 0-9"),
	email,
	integer,
	ip,
	json,
	lower,
	normalize,
	numeric,
	semver,
	trim,
	upper,
	url,
	uuid
})

export declare namespace string {
	export type module = Module<string.submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		alpha: string
		alphanumeric: string
		base64: base64.submodule
		capitalize: capitalize.submodule
		creditCard: string
		date: stringDate.submodule
		digits: string
		email: string
		integer: stringInteger.submodule
		ip: ip.submodule
		json: stringJson.submodule
		lower: lower.submodule
		normalize: normalize.submodule
		numeric: stringNumeric.submodule
		semver: string
		trim: trim.submodule
		upper: upper.submodule
		url: url.submodule
		uuid: uuid.submodule
	}
}
