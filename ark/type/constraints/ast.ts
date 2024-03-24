import type { Schema } from "../kinds.js"
import type { PrimitiveConstraintKind } from "./constraint.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type Constraints = {
	divisor?: { [k: number]: 1 }
	min?: { [k: number]: RangeExclusivity }
	max?: { [k: number]: RangeExclusivity }
	minLength?: { [k: number]: RangeExclusivity }
	maxLength?: { [k: number]: RangeExclusivity }
	after?: { [k: string]: RangeExclusivity }
	before?: { [k: string]: RangeExclusivity }
	regex?: { [k: string]: 1 }
	exactLength?: { [k: number]: 1 }
	predicate?: 1
}

declare const constrained: unique symbol

type constrained = typeof constrained

export type of<t> = {
	[constrained]: t
}

export type intersectConstrainables<l, r> = [l, r] extends [
	of<infer lInner> & infer lConstraints,
	of<infer rInner> & infer rConstraints
]
	? of<lInner & rInner> & lConstraints & rConstraints
	: l extends of<infer lInner> & infer lConstraints
	? of<lInner & r> & lConstraints
	: r extends of<infer rInner> & infer rConstraints
	? of<l & rInner> & rConstraints
	: l & r

export type LimitLiteral = number | DateLiteral

export type RangeExclusivity = "exclusive" | "inclusive"

type Z = number.min<5>

export type min<
	rule extends number,
	exclusivity extends RangeExclusivity = "inclusive"
> = { min: { [k in rule]: exclusivity } }

export type max<
	rule extends number,
	exclusivity extends RangeExclusivity = "inclusive"
> = { max: { [k in rule]: exclusivity } }

export type minLength<
	rule extends number,
	exclusivity extends RangeExclusivity = "inclusive"
> = { minLength: { [k in rule]: exclusivity } }

export type maxLength<
	rule extends number,
	exclusivity extends RangeExclusivity = "inclusive"
> = { maxLength: { [k in rule]: exclusivity } }

export type after<
	rule extends string,
	exclusivity extends RangeExclusivity = "inclusive"
> = { after: { [k in rule]: exclusivity } }

export type before<
	rule extends string,
	exclusivity extends RangeExclusivity = "inclusive"
> = { before: { [k in rule]: exclusivity } }

export type divisor<rule extends number> = {
	divisor: { [k in rule]: 1 }
}

export type exactLength<rule extends number> = {
	exactLength: { [k in rule]: 1 }
}

export type regex<rule extends string> = {
	regex: { [k in rule]: 1 }
}

export type predicate = {
	predicate: 1
}

export namespace number {
	export type min<
		rule extends number,
		exclusivity extends RangeExclusivity = "inclusive"
	> = of<number> & { min: { [k in rule]: exclusivity } }

	export type max<
		rule extends number,
		exclusivity extends RangeExclusivity = "inclusive"
	> = of<number> & { max: { [k in rule]: exclusivity } }

	export type divisor<rule extends number> = of<number> & {
		divisor: { [k in rule]: 1 }
	}

	export type predicate = of<number> & { predicate: 1 }

	export type constrain<
		kind extends PrimitiveConstraintKind,
		schema extends Schema<kind>
	> = normalizePrimitiveConstraintSchema<schema> extends infer rule
		? kind extends "min"
			? min<rule & number>
			: kind extends "max"
			? max<rule & number>
			: kind extends "divisor"
			? divisor<rule & number>
			: predicate
		: never
}

export type constrain<
	t,
	kind extends PrimitiveConstraintKind,
	schema extends Schema<kind>
> = [number, t] extends [t, number]
	? number.constrain<kind, schema>
	: schemaToConstraint<kind, schema> extends infer constraint
	? t extends of<infer base> & infer constraints
		? of<base> & constraints & constraint
		: of<t> & constraint
	: never

export type normalizePrimitiveConstraintSchema<
	schema extends Schema<PrimitiveConstraintKind>
> = "rule" extends keyof schema ? schema["rule"] : schema

export type schemaToConstraint<
	kind extends PrimitiveConstraintKind,
	schema extends Schema<kind>
> = rawConstraint<{
	[_ in kind]: normalizePrimitiveConstraintSchema<schema>
}>

export type ConstraintInput<
	kind extends PrimitiveConstraintKind = PrimitiveConstraintKind
> = kind extends unknown
	? { [_ in kind]: normalizePrimitiveConstraintSchema<Schema<kind>> }
	: never

type ConstraintsByKind<rule> = {
	divisor: divisor<rule & number>
	min: min<rule & number>
	max: max<rule & number>
	minLength: minLength<rule & number>
	maxLength: maxLength<rule & number>
	after: after<rule & string>
	before: before<rule & string>
	regex: regex<rule & string>
	exactLength: exactLength<rule & number>
	predicate: predicate
}

type rawConstraint<input> = ConstraintsByKind<input[keyof input]>[keyof input &
	PrimitiveConstraintKind]

export type constraint<input extends ConstraintInput> = rawConstraint<input>
