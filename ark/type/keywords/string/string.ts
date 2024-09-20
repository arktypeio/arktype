import { intrinsic } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type {
	AtLeastLength,
	AtMostLength,
	Branded,
	Default,
	ExactlyLength,
	LessThanLength,
	MoreThanLength,
	Narrowed,
	Optional,
	constraint,
	of
} from "../inference.ts"
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
	export type atLeastLength<rule> = of<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = of<string, MoreThanLength<rule>>

	export type atMostLength<rule> = of<string, AtMostLength<rule>>

	export type lessThanLength<rule> = of<string, LessThanLength<rule>>

	export type exactlyLength<rule> = of<string, ExactlyLength<rule>>

	export type matching<rule> = of<string, Matching<rule>>

	export type narrowed = of<string, Narrowed>

	export type optional = of<string, Optional>

	export type defaultsTo<rule> = of<string, Default<rule>>

	export type branded<rule> = of<string, Branded<rule>>

	export type is<attributes> = of<string, attributes>

	export type applyAttribute<attribute> =
		attribute extends ExactlyLength<infer rule> ? exactlyLength<rule>
		: attribute extends MoreThanLength<infer rule> ? moreThanLength<rule>
		: attribute extends AtLeastLength<infer rule> ? atLeastLength<rule>
		: attribute extends AtMostLength<infer rule> ? atMostLength<rule>
		: attribute extends LessThanLength<infer rule> ? lessThanLength<rule>
		: attribute extends Matching<infer rule> ? matching<rule>
		: attribute extends Optional ? optional
		: attribute extends Default<infer rule> ? defaultsTo<rule>
		: attribute extends Branded<infer rule> ? branded<rule>
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
		url: url.submodule
		trim: trim.submodule
		normalize: normalize.submodule
		capitalize: capitalize.submodule
		lower: lower.submodule
		upper: upper.submodule
	}
}
