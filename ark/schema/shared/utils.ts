import {
	isArray,
	morph,
	type ErrorMessage,
	type List,
	type evaluate,
	type mutable
} from "@arktype/util"
import type {
	LimitSchemaValue,
	LowerBoundKind,
	NormalizedBoundSchema,
	writeUnboundableMessage
} from "../constraints/refinements/range.js"
import type { Prerequisite, Schema } from "../kinds.js"
import type { BoundKind } from "./implement.js"

export const makeRootAndArrayPropertiesMutable = <o extends object>(o: o) =>
	// TODO: this cast should not be required, but it seems TS is referencing
	// the wrong parameters here?
	morph(o as never, (k, v) => [
		k,
		isArray(v) ? [...v] : v
	]) as makeRootAndArrayPropertiesMutable<o>

export type makeRootAndArrayPropertiesMutable<inner> = {
	-readonly [k in keyof inner]: inner[k] extends List | undefined
		? mutable<inner[k]>
		: inner[k]
} & unknown

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type BoundConstraints = { [k in Comparator]?: LimitSchemaValue }

export type DivisorConstraints = { [k in `%${number}`]: 0 }

export type RegexLiteral<source extends string = string> = `/${source}/`

export type PatternConstraints = {
	[k in RegexLiteral]: true
}

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type DateConstraints = {
	[k in DateLiteral]: true
}

export type AnonymousConstraintKey =
	| "anonymousDate"
	| "anonymousBounds"
	| "anonymousDivisor"
	| "anonymousPattern"
	| "anonymousPredicate"

export type Constraints = evaluate<
	BoundConstraints &
		DivisorConstraints &
		PatternConstraints &
		DateConstraints & { [k in AnonymousConstraintKey]?: true }
>

export type is<basis, constraints> = {
	basis: basis
	constraints: constraints
}

export type constrain<t, constraints extends Constraints> = t extends is<
	infer basis,
	infer lConstraints
>
	? is<basis, lConstraints & constraints>
	: is<t, constraints>

export type intersectConstrainables<l, r> = [l, r] extends [
	is<infer lInner, infer lConstraints>,
	is<infer rInner, infer rConstraints>
]
	? is<lInner & rInner, lConstraints & rConstraints>
	: l extends is<infer lInner, infer lConstraints>
	? is<lInner & r, lConstraints>
	: r extends is<infer rInner, infer rConstraints>
	? is<l & rInner, rConstraints>
	: l & r

export type cast<to> = {
	[inferred]?: to
}

export type Preinferred = cast<unknown>
// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export type LimitLiteral = number | DateLiteral

export type validatedBoundSchema<
	kind extends BoundKind,
	In
> = In extends Prerequisite<kind>
	? Schema<kind>
	: ErrorMessage<writeUnboundableMessage<"node">>

type schemaToComparator<
	kind extends BoundKind,
	schema extends Schema<BoundKind>
> = `${kind extends LowerBoundKind ? ">" : "<"}${schema extends {
	exclusive: true
}
	? ""
	: "="}`

export type schemaToLimit<schema extends Schema<BoundKind>> = (
	schema extends NormalizedBoundSchema ? schema["limit"] : schema
) extends infer limit extends LimitSchemaValue
	? limit extends DateLiteral<infer source>
		? source
		: limit extends Date
		? string
		: limit
	: LimitSchemaValue

export type isNarrowedLimit<limit> = limit extends number
	? number extends limit
		? false
		: true
	: limit extends DateLiteral<infer source>
	? string extends source
		? false
		: true
	: false

export type applyBound<
	t,
	kind extends BoundKind,
	schema extends Schema<BoundKind>
> = constrain<
	t,
	{
		[_ in schemaToComparator<kind, schema>]: schemaToLimit<schema>
	}
>
