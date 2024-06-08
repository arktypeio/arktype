import type { conform, leftIfEqual } from "@arktype/util"
import type { PrimitiveConstraintKind } from "./constraint.js"
import type { NodeSchema } from "./kinds.js"
import type { constraintKindOf } from "./roots/intersection.js"
import type { MorphAst, Out } from "./roots/morph.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type ConstraintSet = Record<PropertyKey, 1>

export type Constraints = Record<string, ConstraintSet>

export declare const constrained: unique symbol

export type constrained = typeof constrained

export type of<base, constraints extends Constraints> = [
	base,
	constrained,
	constraints
]

export type LimitLiteral = number | DateLiteral

export type normalizeLimit<limit> =
	limit extends DateLiteral<infer source> ? source
	: limit extends number | string ? limit
	: never

type constraint<rule> = { [k in rule & PropertyKey]: 1 }

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

export type Literal<rule> = {
	literal: constraint<rule>
}

export type DivisibleBy<rule> = {
	divisibleBy: constraint<rule>
}

export type Length<rule> = {
	length: constraint<rule>
}

export type Matching<rule> = {
	matching: constraint<rule>
}

export type anonymous = "?"

export type Narrowed = {
	predicate: { [k in anonymous]: 1 }
}

export type primitiveConstraintKindOf<In> = Extract<
	PrimitiveConstraintKind,
	constraintKindOf<In>
>

export namespace number {
	export type atLeast<rule> = of<number, AtLeast<rule>>

	export type moreThan<rule> = of<number, MoreThan<rule>>

	export type atMost<rule> = of<number, AtMost<rule>>

	export type lessThan<rule> = of<number, LessThan<rule>>

	export type divisibleBy<rule> = of<number, DivisibleBy<rule>>

	export type narrowed = of<number, Narrowed>

	export type is<constraints extends Constraints> = of<number, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends NodeSchema<kind>
	> =
		normalizePrimitiveConstraintRoot<schema> extends infer rule ?
			kind extends "min" ?
				schema extends { exclusive: true } ?
					moreThan<rule>
				:	atLeast<rule>
			: kind extends "max" ?
				schema extends { exclusive: true } ?
					lessThan<rule>
				:	atMost<rule>
			: kind extends "divisor" ? divisibleBy<rule>
			: narrowed
		:	never
}

export type AtLeastLength<rule> = {
	atLeastLength: constraint<rule>
}

export type AtMostLength<rule> = {
	atMostLength: constraint<rule>
}

export type MoreThanLength<rule> = {
	moreThanLength: constraint<rule>
}

export type LessThanLength<rule> = {
	lessThanLength: constraint<rule>
}

export type ExactlyLength<rule> = {
	atLeastLength: constraint<rule>
	atMostLength: constraint<rule>
}

export namespace string {
	export type atLeastLength<rule> = of<string, AtLeastLength<rule>>

	export type moreThanLength<rule> = of<string, MoreThanLength<rule>>

	export type atMostLength<rule> = of<string, AtMostLength<rule>>

	export type lessThanLength<rule> = of<string, LessThanLength<rule>>

	export type exactlyLength<rule> = of<string, ExactlyLength<rule>>

	export type matching<rule> = of<string, Matching<rule>>

	export type narrowed = of<string, Narrowed>

	export type is<constraints extends Constraints> = of<string, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
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
}

export type AtOrAfter<rule> = {
	atOrAfter: constraint<rule>
}

export type AtOrBefore<rule> = {
	atOrBefore: constraint<rule>
}

export type After<rule> = {
	after: constraint<rule>
}

export type Before<rule> = {
	before: constraint<rule>
}

export namespace Date {
	export type atOrAfter<rule> = of<Date, AtOrAfter<rule>>

	export type after<rule> = of<Date, After<rule>>

	export type atOrBefore<rule> = of<Date, AtOrBefore<rule>>

	export type before<rule> = of<Date, Before<rule>>

	export type narrowed = of<Date, Narrowed>

	export type literal<rule> = of<Date, Literal<rule>>

	export type is<constraints extends Constraints> = of<Date, constraints>

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends NodeSchema<kind>
	> =
		normalizePrimitiveConstraintRoot<schema> extends infer rule ?
			kind extends "after" ?
				schema extends { exclusive: true } ?
					after<normalizeLimit<rule>>
				:	atOrAfter<normalizeLimit<rule>>
			: kind extends "before" ?
				schema extends { exclusive: true } ?
					before<normalizeLimit<rule>>
				:	atOrBefore<normalizeLimit<rule>>
			:	narrowed
		:	never
}

export type constrain<
	t,
	kind extends PrimitiveConstraintKind,
	schema extends NodeSchema<kind>
> =
	t extends MorphAst<infer i, infer o> ?
		(In: leftIfEqual<i, _constrain<i, kind, schema>>) => Out<o>
	:	leftIfEqual<t, _constrain<t, kind, schema>>

type _constrain<
	t,
	kind extends PrimitiveConstraintKind,
	schema extends NodeSchema<kind>
> =
	schemaToConstraint<kind, schema> extends infer constraint ?
		t extends of<infer base, infer constraints> ?
			[number, base] extends [base, number] ?
				number.is<constraint & constraints>
			: [string, base] extends [base, string] ?
				string.is<constraint & constraints>
			: [Date, base] extends [base, Date] ? Date.is<constraint & constraints>
			: of<base, constraints & constraint>
		: [number, t] extends [t, number] ? number.constrain<kind, schema>
		: [string, t] extends [t, string] ? string.constrain<kind, schema>
		: [Date, t] extends [t, Date] ? Date.constrain<kind, schema>
		: of<t, conform<constraint, Constraints>>
	:	never

export type normalizePrimitiveConstraintRoot<
	schema extends NodeSchema<PrimitiveConstraintKind>
> =
	"rule" extends keyof schema ? conform<schema["rule"], PropertyKey>
	:	conform<schema, PropertyKey>

export type schemaToConstraint<
	kind extends PrimitiveConstraintKind,
	schema extends NodeSchema<kind>
> =
	normalizePrimitiveConstraintRoot<schema> extends infer rule ?
		kind extends "pattern" ? Matching<rule>
		: kind extends "divisor" ? DivisibleBy<rule>
		: kind extends "exactLength" ? Length<rule>
		: kind extends "min" ?
			schema extends { exclusive: true } ?
				MoreThan<rule>
			:	AtLeast<rule>
		: kind extends "max" ?
			schema extends { exclusive: true } ?
				LessThan<rule>
			:	AtMost<rule>
		: kind extends "minLength" ?
			schema extends { exclusive: true } ?
				MoreThanLength<rule>
			:	AtLeastLength<rule>
		: kind extends "maxLength" ?
			schema extends { exclusive: true } ?
				LessThanLength<rule>
			:	AtMostLength<rule>
		: kind extends "exactLength" ? ExactlyLength<rule>
		: kind extends "after" ?
			schema extends { exclusive: true } ?
				After<normalizeLimit<rule>>
			:	AtOrAfter<normalizeLimit<rule>>
		: kind extends "before" ?
			schema extends { exclusive: true } ?
				Before<normalizeLimit<rule>>
			:	AtOrBefore<normalizeLimit<rule>>
		:	Narrowed
	:	never
