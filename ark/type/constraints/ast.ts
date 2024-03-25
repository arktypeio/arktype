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

export type atLeast_<rule extends number | string> = {
	min: { [k in rule]: 0 | 1 }
}

export type atMost_<rule extends number | string> = {
	max: { [k in rule]: 0 | 1 }
}

export type moreThan_<rule extends number | string> = {
	min: { [k in rule]: 0 }
}

export type lessThan_<rule extends number | string> = {
	max: { [k in rule]: 0 }
}

export type dateLiteral_<rule extends string | number> = { dateLiteral: rule }

export type divisibleBy_<rule extends number> = {
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
	export type atLeast<rule extends number> = of<number, atLeast_<rule>>

	export type moreThan<rule extends number> = of<number, moreThan_<rule>>

	export type atMost<rule extends number> = of<number, atMost_<rule>>

	export type lessThan<rule extends number> = of<number, lessThan_<rule>>

	export type divisibleBy<rule extends number> = of<number, divisibleBy_<rule>>

	export type narrowed = of<number, predicate>

	export type _<constraints extends Constraints> = of<number, constraints>

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

export type atLeastLength_<rule extends number | string> = {
	min: { [k in rule]: 0 | 1 }
}

export type atMostLength_<rule extends number | string> = {
	max: { [k in rule]: 0 | 1 }
}

export type moreThanLength_<rule extends number | string> = {
	min: { [k in rule]: 0 }
}

export type lessThanLength_<rule extends number | string> = {
	max: { [k in rule]: 0 }
}

export namespace string {
	export type atLeastLength<rule extends number> = of<
		string,
		atLeastLength_<rule>
	>

	export type moreThanLength<rule extends number> = of<
		string,
		moreThanLength_<rule>
	>

	export type atMostLength<rule extends number> = of<
		string,
		atMostLength_<rule>
	>

	export type lessThanLength<rule extends number> = of<
		string,
		lessThanLength_<rule>
	>

	export type matching<rule extends string> = of<string, regex<rule>>

	export type narrowed = of<string, predicate>

	export type _<constraints extends Constraints> = of<string, constraints>

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

export type atOrAfter_<rule extends number | string> = {
	min: { [k in rule]: 0 | 1 }
}

export type atOrBefore_<rule extends number | string> = {
	max: { [k in rule]: 0 | 1 }
}

export type after_<rule extends number | string> = {
	min: { [k in rule]: 0 }
}

export type before_<rule extends number | string> = {
	max: { [k in rule]: 0 }
}

export namespace Date {
	export type atOrAfter<rule extends string> = of<Date, atOrAfter_<rule>>

	export type after<rule extends string> = of<Date, after_<rule>>

	export type atOrBefore<rule extends string> = of<Date, atOrBefore_<rule>>

	export type before<rule extends string> = of<Date, before_<rule>>

	export type narrowed = of<Date, predicate>

	export type literal<rule extends string | number> = of<
		Date,
		dateLiteral_<rule>
	>

	export type _<constraints extends Constraints> = of<Date, constraints>

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
			? number._<constraint & constraints>
			: [string, base] extends [base, string]
			? string._<constraint & constraints>
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
		? divisibleBy_<rule & number>
		: kind extends "exactLength"
		? length<rule & number>
		: kind extends "min" | "minLength" | "after"
		? schema extends { exclusive: true }
			? moreThan_<rule & (string | number)>
			: atLeast_<rule & (string | number)>
		: kind extends "max" | "maxLength" | "before"
		? schema extends { exclusive: true }
			? lessThan_<rule & (string | number)>
			: atMost_<rule & (string | number)>
		: predicate
	: never
