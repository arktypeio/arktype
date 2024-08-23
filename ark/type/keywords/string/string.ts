import { intrinsic, type Constraint, type NodeSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { type } from "../ark.ts"
import type {
	AtLeastLength,
	AtMostLength,
	Branded,
	Constraints,
	ExactlyLength,
	LessThanLength,
	Matching,
	MoreThanLength,
	Narrowed,
	constrain,
	normalizePrimitiveConstraintRoot
} from "../ast.ts"
import { submodule } from "../utils.ts"
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

export const string = submodule({
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
	trim,
	upper,
	lower,
	normalize,
	capitalize,
	date: stringDate
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

	export type module = Module<string.submodule>

	export type submodule = Submodule<$>

	export type $ = {
		$root: string
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

	export interface deepResolutions
		extends shallowResolutions,
			stringNumeric.deepResolutions,
			stringInteger.deepResolutions,
			uuid.deepResolutions,
			ip.deepResolutions,
			stringJson.deepResolutions,
			stringDate.deepResolutions,
			trim.deepResolutions,
			normalize.deepResolutions,
			capitalize.deepResolutions,
			lower.deepResolutions,
			upper.deepResolutions {}
}
