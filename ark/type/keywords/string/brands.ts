import type {
	AtLeastLength,
	AtMostLength,
	Default,
	ExactlyLength,
	LessThanLength,
	MoreThanLength,
	Narrowed,
	Nominal,
	Optional,
	brand
} from "../inference.ts"
import type { Matching } from "./string.ts"

declare namespace string {
	export type atLeastLength<rule> = brand<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = brand<string, MoreThanLength<rule>>

	export type atMostLength<rule> = brand<string, AtMostLength<rule>>

	export type lessThanLength<rule> = brand<string, LessThanLength<rule>>

	export type exactlyLength<rule> = brand<string, ExactlyLength<rule>>

	export type matching<rule> = brand<string, Matching<rule>>

	export type narrowed = brand<string, Narrowed>

	export type optional = brand<string, Optional>

	export type defaultsTo<rule> = brand<string, Default<rule>>

	export type branded<rule> = brand<string, Nominal<rule>>

	export type is<attributes> = brand<string, attributes>

	export type applyBrand<attribute> =
		attribute extends ExactlyLength<infer rule> ? exactlyLength<rule>
		: attribute extends MoreThanLength<infer rule> ? moreThanLength<rule>
		: attribute extends AtLeastLength<infer rule> ? atLeastLength<rule>
		: attribute extends AtMostLength<infer rule> ? atMostLength<rule>
		: attribute extends LessThanLength<infer rule> ? lessThanLength<rule>
		: attribute extends Matching<infer rule> ? matching<rule>
		: attribute extends Optional ? optional
		: attribute extends Default<infer rule> ? defaultsTo<rule>
		: attribute extends Nominal<infer rule> ? branded<rule>
		: never
}

export type { string as brandedString }
