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

export type intersectConstrainables<l, r> = [l, r] extends [
	of<infer lInner, infer lConstraints>,
	of<infer rInner, infer rConstraints>
]
	? of<lInner & rInner, lConstraints & rConstraints>
	: l extends of<infer lInner, infer lConstraints>
	? of<lInner & r, lConstraints>
	: r extends of<infer rInner, infer rConstraints>
	? of<l & rInner, rConstraints>
	: l & r

export type LimitLiteral = number | DateLiteral

export type min<rule extends number | string> = { min: { [k in rule]: 0 | 1 } }

export type max<rule extends number | string> = { max: { [k in rule]: 0 | 1 } }

export type more<rule extends number | string> = { min: { [k in rule]: 0 } }

export type less<rule extends number | string> = { max: { [k in rule]: 0 } }

export type dateLiteral<rule extends string | number> = { dateLiteral: rule }

export type divisor<rule extends number> = {
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
	export type atLeast<rule extends number> = of<number, min<rule>>

	export type moreThan<rule extends number> = of<number, more<rule>>

	export type atMost<rule extends number> = of<number, max<rule>>

	export type lessThan<rule extends number> = of<number, less<rule>>

	export type divisibleBy<rule extends number> = of<number, divisor<rule>>

	export type narrowed = of<number, predicate>

	export type all<constraints extends Constraints> = of<number, constraints>

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

export namespace string {
	export type atLeastLength<rule extends number> = of<string, min<rule>>

	export type moreThanLength<rule extends number> = of<string, more<rule>>

	export type atMostLength<rule extends number> = of<string, max<rule>>

	export type lessThanLength<rule extends number> = of<string, less<rule>>

	export type matching<rule extends string> = of<string, regex<rule>>

	export type narrowed = of<string, predicate>

	export type all<constraints extends Constraints> = of<string, constraints>

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

export namespace Date {
	export type atOrAfter<rule extends string> = of<Date, min<rule>>

	export type after<rule extends string> = of<Date, more<rule>>

	export type atOrBefore<rule extends string> = of<Date, max<rule>>

	export type before<rule extends string> = of<Date, less<rule>>

	export type narrowed = of<Date, predicate>

	export type literal<rule extends string | number> = of<
		Date,
		dateLiteral<rule>
	>

	export type all<constraints extends Constraints> = of<Date, constraints>

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
			? number.all<constraint & constraints>
			: [string, base] extends [base, string]
			? string.all<constraint & constraints>
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
		? divisor<rule & number>
		: kind extends "exactLength"
		? length<rule & number>
		: kind extends "min" | "minLength" | "after"
		? schema extends { exclusive: true }
			? more<rule & (string | number)>
			: min<rule & (string | number)>
		: kind extends "max" | "maxLength" | "before"
		? schema extends { exclusive: true }
			? less<rule & (string | number)>
			: max<rule & (string | number)>
		: predicate
	: never
