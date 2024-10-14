import { intrinsic, rootSchema } from "@ark/schema"
import type {
	Anonymous,
	AtLeast,
	AtMost,
	AttributeKind,
	Attributes,
	brand,
	Default,
	DivisibleBy,
	LessThan,
	MoreThan,
	Nominal,
	of,
	Optional
} from "../../attributes.ts"
import type { Module, Submodule } from "../../module.ts"
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

	export type AttributableKind = AttributeKind.defineAttributable<
		"divisibleBy" | "moreThan" | "atLeast" | "atMost" | "lessThan"
	>

	export type minSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? MoreThan<rule> : AtLeast<rule>

	export type maxSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? LessThan<rule> : AtMost<rule>

	export type withSingleAttribute<
		kind extends AttributableKind,
		value extends Attributes[kind]
	> = raw.withSingleAttribute<kind, value>

	export namespace raw {
		export type withSingleAttribute<kind, value> =
			kind extends "nominal" ? nominal<value>
			: kind extends "divisibleBy" ? divisibleBy<value>
			: kind extends "moreThan" ? moreThan<value>
			: kind extends "atLeast" ? atLeast<value>
			: kind extends "atMost" ? atMost<value>
			: kind extends "lessThan" ? lessThan<value>
			: kind extends "optional" ? optional
			: kind extends "defaultsTo" ? defaultsTo<value>
			: never
	}

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

	export type branded<rule> = brand<number, Nominal<rule>>

	export namespace branded {
		export type atLeast<rule> = brand<number, AtLeast<rule>>

		export type moreThan<rule> = brand<number, MoreThan<rule>>

		export type atMost<rule> = brand<number, AtMost<rule>>

		export type lessThan<rule> = brand<number, LessThan<rule>>

		export type divisibleBy<rule> = brand<number, DivisibleBy<rule>>

		export type is<attributes> = brand<number, attributes>

		export type anonymous = brand<number, Anonymous>

		export type withSingleAttribute<
			kind extends AttributableKind,
			value extends Attributes[kind]
		> = raw.withSingleAttribute<kind, value>

		export namespace raw {
			export type withSingleAttribute<kind, value> =
				kind extends "nominal" ? nominal<value>
				: kind extends "divisibleBy" ? divisibleBy<value>
				: kind extends "moreThan" ? moreThan<value>
				: kind extends "atLeast" ? atLeast<value>
				: kind extends "atMost" ? atMost<value>
				: kind extends "lessThan" ? lessThan<value>
				: never
		}
	}
}
