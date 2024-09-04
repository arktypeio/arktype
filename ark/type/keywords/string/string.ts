import { intrinsic } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { type } from "../ark.ts"
import type {
	AtLeastLength,
	AtMostLength,
	Branded,
	Constraints,
	ExactlyLength,
	LessThanLength,
	MoreThanLength,
	Narrowed,
	Optional,
	constrain,
	constraint
} from "../ast.ts"
import { arkModule } from "../utils.ts"
import { alpha } from "./alpha.ts"
import { alphanumeric } from "./alphanumeric.ts"
import { capitalize } from "./capitalize.ts"
import { creditCard } from "./creditCard.ts"
import { stringDate } from "./date.ts"
import { digits } from "./digits.ts"
import { email } from "./email.ts"
import { integer, type stringInteger } from "./integer.ts"
import { ip } from "./ip.ts"
import { json, type stringJson } from "./json.ts"
import { lower } from "./lower.ts"
import { normalize } from "./normalize.ts"
import { numeric, type stringNumeric } from "./numeric.ts"
import { semver } from "./semver.ts"
import { trim } from "./trim.ts"
import { upper } from "./upper.ts"
import { url } from "./url.ts"
import { uuid } from "./uuid.ts"

export const string = arkModule({
	root: intrinsic.string,
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
	trim,
	upper,
	lower,
	normalize,
	capitalize,
	date: stringDate
})

export type Matching<rule> = {
	matching: constraint<rule>
}

export declare namespace string {
	export type atLeastLength<rule> = constrain<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = constrain<string, MoreThanLength<rule>>

	export type atMostLength<rule> = constrain<string, AtMostLength<rule>>

	export type lessThanLength<rule> = constrain<string, LessThanLength<rule>>

	export type exactlyLength<rule> = constrain<string, ExactlyLength<rule>>

	export type matching<rule> = constrain<string, Matching<rule>>

	export type narrowed = constrain<string, Narrowed>

	export type optional = constrain<string, Optional>

	export type branded<rule> = constrain<string, Branded<rule>>

	export type is<constraints extends Constraints> = constrain<
		string,
		constraints
	>

	export type withConstraint<constraint> =
		constraint extends ExactlyLength<infer rule> ? exactlyLength<rule>
		: constraint extends MoreThanLength<infer rule> ? moreThanLength<rule>
		: constraint extends AtLeastLength<infer rule> ? atLeastLength<rule>
		: constraint extends AtMostLength<infer rule> ? atMostLength<rule>
		: constraint extends LessThanLength<infer rule> ? lessThanLength<rule>
		: constraint extends Matching<infer rule> ? matching<rule>
		: constraint extends Optional ? optional
		: constraint extends Narrowed ? narrowed
		: never

	export type module = Module<string.submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string
		alpha: alpha
		alphanumeric: alphanumeric
		digits: digits
		numeric: stringNumeric.submodule
		integer: stringInteger.submodule
		creditCard: creditCard
		email: email
		uuid: uuid.submodule
		semver: semver
		ip: ip.submodule
		json: stringJson.submodule
		date: stringDate.submodule

		trim: trim.submodule
		normalize: normalize.submodule
		capitalize: capitalize.submodule
		lower: lower.submodule
		upper: upper.submodule
	}

	type shallowResolutions = {
		[k in keyof $ as `string.${k}`]: $[k] extends type.cast<infer t> ? t : $[k]
	}
}
