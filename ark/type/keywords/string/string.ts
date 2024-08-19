import { intrinsic, type Constraint, type NodeSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type {
	AtLeastLength,
	AtMostLength,
	Branded,
	constrain,
	Constraints,
	ExactlyLength,
	LessThanLength,
	Matching,
	MoreThanLength,
	Narrowed,
	normalizePrimitiveConstraintRoot
} from "../ast.ts"
import { epoch } from "../number/epoch.ts"
import { submodule } from "../utils.ts"
import { alpha } from "./alpha.ts"
import { alphanumeric } from "./alphanumeric.ts"
import { capitalized, toCapitalized } from "./capitalized.ts"
import { creditCard } from "./creditCard.ts"
import { digits } from "./digits.ts"
import { email } from "./email.ts"
import { integer } from "./integer.ts"
import { ip } from "./ip.ts"
import { json } from "./json.ts"
import { lower, toLower } from "./lower.ts"
import { normalized, toNormalized } from "./normalized.ts"
import { numeric } from "./numeric.ts"
import { semver } from "./semver.ts"
import { toTrimmed, trimmed } from "./trim.ts"
import { toUpper, upper } from "./upper.ts"
import { url } from "./url.ts"
import { uuid } from "./uuid.ts"

export const string: Module<string.submodule> = submodule({
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
	json,
	trimmed,
	toTrimmed,
	capitalized,
	toCapitalized,
	upper,
	toUpper,
	lower,
	toLower,
	normalized,
	toNormalized,
	epoch
})

export declare namespace string {
	export type atLeastLength<rule> = constrain<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = constrain<string, MoreThanLength<rule>>

	export type atMostLength<rule> = constrain<string, AtMostLength<rule>>

	export type lessThanLength<rule> = constrain<string, LessThanLength<rule>>

	export type exactlyLength<rule> = constrain<string, ExactlyLength<rule>>

	export type matching<rule> = constrain<string, Matching<rule>>

	export type narrowed = constrain<string, Narrowed>

	export type branded<rule> = constrain<string, Branded<rule>>

	export type url = constrain<string, Branded<"url">>

	export type integer = constrain<string, Branded<"integer">>

	export type is<constraints extends Constraints> = constrain<
		string,
		constraints
	>

	export type parseConstraint<
		kind extends Constraint.PrimitiveKind,
		schema extends NodeSchema<kind>
	> =
		normalizePrimitiveConstraintRoot<schema> extends infer rule ?
			kind extends "minLength" ?
				schema extends { exclusive: true } ?
					moreThanLength<rule>
				:	atLeastLength<rule>
			: kind extends "maxLength" ?
				schema extends { exclusive: true } ?
					lessThanLength<rule>
				:	atMostLength<rule>
			: kind extends "pattern" ? matching<rule & string>
			: kind extends "exactLength" ? exactlyLength<rule>
			: narrowed
		:	never

	export type submodule = Submodule<{
		$root: string
		alpha: alpha
		alphanumeric: alphanumeric
		digits: digits
		numeric: numeric
		integer: integer
		creditCard: creditCard
		email: email
		uuid: uuid
		semver: semver
		ip: ip
		json: json
		trimmed: trimmed
		toTrimmed: toTrimmed
		capitalized: capitalized
		toCapitalized: toCapitalized
		normalized: normalized
		toNormalized: toNormalized
		lower: lower
		toLower: toLower
		upper: upper
		toUpper: toUpper

		iso8601: string.narrowed
		epoch: string.narrowed
	}>
}
