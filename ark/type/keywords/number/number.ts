import { intrinsic, rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type {
	Anonymous,
	BaseAttributes,
	brand,
	constraint,
	Default,
	Nominal,
	of,
	Optional
} from "../inference.ts"
import { arkModule } from "../utils.ts"
import { epoch } from "./epoch.ts"
import { integer } from "./integer.ts"

export const number: number.module = arkModule({
	root: intrinsic.number,
	integer,
	epoch,
	safe: rootSchema({
		domain: "number",
		min: Number.MIN_SAFE_INTEGER,
		max: Number.MAX_SAFE_INTEGER,
		predicate: {
			predicate: n => !Number.isNaN(n),
			meta: "a safe number"
		}
	}),
	NaN: ["===", Number.NaN],
	Infinity: ["===", Number.POSITIVE_INFINITY],
	NegativeInfinity: ["===", Number.NEGATIVE_INFINITY]
})

export type AtLeast<rule> = {
	atLeast: constraint<rule>
}

export type AtMost<rule> = {
	atMost: constraint<rule>
}

export type MoreThan<rule> = {
	moreThan: constraint<rule>
}

export type LessThan<rule> = {
	lessThan: constraint<rule>
}

export type DivisibleBy<rule> = {
	divisibleBy: constraint<rule>
}

export declare namespace number {
	export type atLeast<rule> = of<number, AtLeast<rule>>

	export type moreThan<rule> = of<number, MoreThan<rule>>

	export type atMost<rule> = of<number, AtMost<rule>>

	export type lessThan<rule> = of<number, LessThan<rule>>

	export type divisibleBy<rule> = of<number, DivisibleBy<rule>>

	export type anonymous = of<number, Anonymous>

	export type optional = of<number, Optional>

	export type defaultsTo<rule> = of<number, Default<rule>>

	export type nominal<rule> = of<number, Nominal<rule>>

	export type NaN = nominal<"NaN">

	export type Infinity = nominal<"Infinity">

	export type NegativeInfinity = nominal<"NegativeInfinity">

	export type safe = nominal<"safe">

	export type is<attributes> = of<number, attributes>

	interface ownConstraints
		extends AtLeast<number>,
			MoreThan<number>,
			LessThan<number>,
			AtMost<number>,
			DivisibleBy<number> {}

	export interface Attributes extends BaseAttributes, Partial<ownConstraints> {}

	export type minSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? MoreThan<rule> : AtLeast<rule>

	export type maxSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? LessThan<rule> : AtMost<rule>

	export type apply<attribute> =
		attribute extends MoreThan<infer rule> ? moreThan<rule>
		: attribute extends AtLeast<infer rule> ? atLeast<rule>
		: attribute extends AtMost<infer rule> ? atMost<rule>
		: attribute extends LessThan<infer rule> ? lessThan<rule>
		: attribute extends DivisibleBy<infer rule> ? divisibleBy<rule>
		: attribute extends Optional ? optional
		: attribute extends Default<infer rule> ? defaultsTo<rule>
		: attribute extends Nominal<infer rule> ? nominal<rule>
		: never

	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: number
		epoch: epoch
		integer: integer
		safe: safe
		NaN: NaN
		Infinity: Infinity
		NegativeInfinity: NegativeInfinity
	}

	export type branded<rule> = brand<string, Nominal<rule>>

	export namespace branded {
		export type atLeast<rule> = brand<number, AtLeast<rule>>

		export type moreThan<rule> = brand<number, MoreThan<rule>>

		export type atMost<rule> = brand<number, AtMost<rule>>

		export type lessThan<rule> = brand<number, LessThan<rule>>

		export type divisibleBy<rule> = brand<number, DivisibleBy<rule>>

		export type is<attributes> = brand<number, attributes>

		export type anonymous = brand<number, Anonymous>

		export type apply<attribute> =
			attribute extends MoreThan<infer rule> ? moreThan<rule>
			: attribute extends AtLeast<infer rule> ? atLeast<rule>
			: attribute extends AtMost<infer rule> ? atMost<rule>
			: attribute extends LessThan<infer rule> ? lessThan<rule>
			: attribute extends DivisibleBy<infer rule> ? divisibleBy<rule>
			: attribute extends Optional ? optional
			: never
	}
}
