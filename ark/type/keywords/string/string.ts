import { intrinsic } from "@ark/schema"
import type { Out, string } from "../../ast.ts"
import type { Module, Submodule } from "../../module.ts"
import { epoch } from "../number/number.ts"
import { submodule } from "../utils.ts"
import { alpha } from "./alpha.ts"
import { alphanumeric } from "./alphanumeric.ts"
import { capitalized, toCapitalized } from "./capitalized.ts"
import { creditCard } from "./creditCard.ts"
import { digits } from "./digits.ts"
import { email } from "./email.ts"
import { integer } from "./integer.ts"
import { ip } from "./ip.ts"
import { lower, toLower } from "./lower.ts"
import { normalized, toNormalized } from "./normalize.ts"
import { numeric } from "./numeric.ts"
import { semver } from "./semver.ts"
import { toTrimmed, trimmed } from "./trim.ts"
import { toUpper, upper } from "./upper.ts"
import { url } from "./url.ts"
import { uuid } from "./uuid.ts"

export const arkString: Module<arkString> = submodule({
	$root: intrinsic.string,
	numeric,
	integer,
	alpha,
	alphanumeric,
	digits,
	semver,
	ip,
	creditCard,
	email,
	uuid,
	url,
	trimmed,
	capitalized,
	upper,
	lower,
	normalized,
	to: submodule({
		trimmed: toTrimmed,
		capitalized: toCapitalized,
		upper: toUpper,
		lower: toLower,
		normalized: toNormalized
	}),

	iso8601,
	epoch,
	json
})

export type arkString = Submodule<{
	$root: string
	alpha: alpha
	alphanumeric: alphanumeric
	digits: digits
	lower: lower
	upper: upper
	numeric: numeric
	integer: integer
	creditCard: creditCard
	email: email
	uuid: uuid
	semver: semver
	ip: ip
	trimmed: trimmed
	capitalized: capitalized
	to: Submodule<{
		trimmed: toTrimmed
		capitalized: toCapitalized
		upper: toUpper
		lower: toLower
		normalized: toNormalized
	}>

	iso8601: string.narrowed
	epoch: string.narrowed

	date: (In: string) => Out<Date>
	json: (In: string) => Out<object>
}>
