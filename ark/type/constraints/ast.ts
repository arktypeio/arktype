import type { conform } from "@arktype/util"
import type { Schema } from "../kinds.js"
import type { constraintKindOf } from "../types/intersection.js"
import type { PrimitiveConstraintKind } from "./constraint.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type Constraints = {
	divisor?: { [k: number]: 1 }
	min?: { [k: number | string]: 0 | 1 }
	max?: { [k: number | string]: 0 | 1 }
	regex?: { [k: string]: 1 }
	length?: { [k: number]: 1 }
	predicate?: 1
	dateLiteral?: string | number
}

declare const constrained: unique symbol

type constrained = typeof constrained

export type of<base, constraints extends Constraints> = [
	base,
	constrained,
	constraints
]

export type LimitLiteral = number | DateLiteral

export type AtLeast<rule extends number | string> = {
	min: { [k in rule]: 0 | 1 }
}

export type AtMost<rule extends number | string> = {
	max: { [k in rule]: 0 | 1 }
}

export type MoreThan<rule extends number | string> = {
	min: { [k in rule]: 0 }
}

export type LessThan<rule extends number | string> = {
	max: { [k in rule]: 0 }
}

export type dateLiteral_<rule extends string | number> = { dateLiteral: rule }

export type DivisibleBy<rule extends number> = {
	divisor: { [k in rule]: 1 }
}

export type length<rule extends number> = {
	length: { [k in rule]: 1 }
}

export type regex<rule extends string> = {
	regex: { [k in rule]: 1 }
}

export type predicate = {
	predicate: 1
}

export type primitiveConstraintKindOf<In> = Extract<
	PrimitiveConstraintKind,
	constraintKindOf<In>
>

export namespace number {
	export type atLeast<rule extends number> = of<number, AtLeast<rule>>

	export type moreThan<rule extends number> = of<number, MoreThan<rule>>

	export type atMost<rule extends number> = of<number, AtMost<rule>>

	export type lessThan<rule extends number> = of<number, LessThan<rule>>

	export type divisibleBy<rule extends number> = of<number, DivisibleBy<rule>>

	export type narrowed = of<number, predicate>

	export type is<constraints extends Constraints> = of<number, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends Schema<kind>
	> = normalizePrimitiveConstraintSchema<schema> extends infer rule
		? kind extends "min"
			? schema extends { exclusive: true }
				? moreThan<rule & number>
				: atLeast<rule & number>
			: kind extends "max"
			? schema extends { exclusive: true }
				? lessThan<rule & number>
				: atMost<rule & number>
			: kind extends "divisor"
			? divisibleBy<rule & number>
			: narrowed
		: never
}

export type AtLeastLength<rule extends number | string> = {
	min: { [k in rule]: 0 | 1 }
}

export type AtMostLength<rule extends number | string> = {
	max: { [k in rule]: 0 | 1 }
}

export type MoreThanLength<rule extends number | string> = {
	min: { [k in rule]: 0 }
}

export type LessThanLength<rule extends number | string> = {
	max: { [k in rule]: 0 }
}

export namespace string {
	export type atLeastLength<rule extends number> = of<
		string,
		AtLeastLength<rule>
	>

	export type moreThanLength<rule extends number> = of<
		string,
		MoreThanLength<rule>
	>

	export type atMostLength<rule extends number> = of<string, AtMostLength<rule>>

	export type lessThanLength<rule extends number> = of<
		string,
		LessThanLength<rule>
	>

	export type matching<rule extends string> = of<string, regex<rule>>

	export type narrowed = of<string, predicate>

	export type is<constraints extends Constraints> = of<string, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends Schema<kind>
	> = normalizePrimitiveConstraintSchema<schema> extends infer rule
		? kind extends "minLength"
			? schema extends { exclusive: true }
				? moreThanLength<rule & number>
				: atLeastLength<rule & number>
			: kind extends "maxLength"
			? schema extends { exclusive: true }
				? lessThanLength<rule & number>
				: atMostLength<rule & number>
			: kind extends "regex"
			? matching<rule & string>
			: narrowed
		: never
}

export type AtOrAfter<rule extends number | string> = {
	min: { [k in rule]: 0 | 1 }
}

export type AtOrBefore<rule extends number | string> = {
	max: { [k in rule]: 0 | 1 }
}

export type After<rule extends number | string> = {
	min: { [k in rule]: 0 }
}

export type Before<rule extends number | string> = {
	max: { [k in rule]: 0 }
}

export namespace Date {
	export type atOrAfter<rule extends string> = of<Date, AtOrAfter<rule>>

	export type after<rule extends string> = of<Date, After<rule>>

	export type atOrBefore<rule extends string> = of<Date, AtOrBefore<rule>>

	export type before<rule extends string> = of<Date, Before<rule>>

	export type narrowed = of<Date, predicate>

	export type literal<rule extends string | number> = of<
		Date,
		dateLiteral_<rule>
	>

	export type is<constraints extends Constraints> = of<Date, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends Schema<kind>
	> = normalizePrimitiveConstraintSchema<schema> extends infer rule
		? kind extends "after"
			? schema extends { exclusive: true }
				? after<rule & string>
				: atOrAfter<rule & string>
			: kind extends "before"
			? schema extends { exclusive: true }
				? before<rule & string>
				: atOrBefore<rule & string>
			: narrowed
		: never
}

export type constrain<
	t,
	kind extends PrimitiveConstraintKind,
	schema extends Schema<kind>
> = schemaToConstraint<kind, schema> extends infer constraint
	? t extends of<infer base, infer constraints>
		? [number, base] extends [base, number]
			? number.is<constraint & constraints>
			: [string, base] extends [base, string]
			? string.is<constraint & constraints>
			: of<base, constraints & constraint>
		: [number, t] extends [t, number]
		? number.constrain<kind, schema>
		: [string, t] extends [t, string]
		? string.constrain<kind, schema>
		: of<t, conform<constraint, Constraints>>
	: never

export type normalizePrimitiveConstraintSchema<
	schema extends Schema<PrimitiveConstraintKind>
> = "rule" extends keyof schema
	? conform<schema["rule"], string | number>
	: conform<schema, string | number>

export type schemaToConstraint<
	kind extends PrimitiveConstraintKind,
	schema extends Schema<kind>
> = normalizePrimitiveConstraintSchema<schema> extends infer rule
	? kind extends "regex"
		? regex<rule & string>
		: kind extends "divisor"
		? DivisibleBy<rule & number>
		: kind extends "exactLength"
		? length<rule & number>
		: kind extends "min" | "minLength" | "after"
		? schema extends { exclusive: true }
			? MoreThan<rule & (string | number)>
			: AtLeast<rule & (string | number)>
		: kind extends "max" | "maxLength" | "before"
		? schema extends { exclusive: true }
			? LessThan<rule & (string | number)>
			: AtMost<rule & (string | number)>
		: predicate
	: never
