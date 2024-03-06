import type { ErrorMessage, conform, describe, evaluate } from "@arktype/util"
import type { Prerequisite, Schema } from "../kinds.js"
import type { writeInvalidOperandMessage } from "../shared/implement.js"
import type {
	PrimitiveConstraintInner,
	PrimitiveConstraintKind
} from "./constraint.js"
import type { predicate } from "./predicate.js"
import type { after } from "./refinements/after.js"
import type { before } from "./refinements/before.js"
import type { divisor } from "./refinements/divisor.js"
import type { length } from "./refinements/length.js"
import type { max } from "./refinements/max.js"
import type { maxLength } from "./refinements/maxLength.js"
import type { min } from "./refinements/min.js"
import type { minLength } from "./refinements/minLength.js"
import type { LimitSchemaValue } from "./refinements/range.js"
import type { regex } from "./refinements/regex.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type BoundConstraints = { [k in Comparator]?: LimitSchemaValue }

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type Constraints = evaluate<
	BoundConstraints & {
		[k: DateLiteral | RegexLiteral]: true
		"%"?: number
		":"?: true
	}
>

export type is<basis> = {
	basis: basis
}

export type intersectConstrainables<l, r> = [l, r] extends [
	is<infer lInner> & infer lConstraints,
	is<infer rInner> & infer rConstraints
]
	? is<lInner & rInner> & lConstraints & rConstraints
	: l extends is<infer lInner> & infer lConstraints
	? is<lInner & r> & lConstraints
	: r extends is<infer rInner> & infer rConstraints
	? is<l & rInner> & rConstraints
	: l & r

export type LimitLiteral = number | DateLiteral

export type validateConstraintArg<
	kind extends PrimitiveConstraintKind,
	In
> = In extends Prerequisite<kind>
	? Schema<kind>
	: ErrorMessage<
			writeInvalidOperandMessage<
				kind,
				describe<Prerequisite<kind>>,
				describe<In>
			>
	  >

// export type constrain<t, constraints extends Constraints> = rawConstrain<
// 	t,
// 	constraints
// >

export type constrain<In, constraint> = In extends is<infer base> &
	infer constraints
	? is<base> & constraints & constraint
	: is<In> & constraint

export type normalizePrimitiveConstraintSchema<
	schema extends Schema<PrimitiveConstraintKind>
> = schema extends PrimitiveConstraintInner<infer rule> ? rule : schema

export type applySchema<
	t,
	kind extends PrimitiveConstraintKind,
	schema
> = constrain<t, schemaToConstraint<kind, conform<schema, Schema<kind>>>>

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

type Bases<rule> = {
	divisor: divisor<rule & number>
	min: min<rule & number>
	max: max<rule & number>
	minLength: minLength<rule & number>
	maxLength: maxLength<rule & number>
	after: after<rule & string>
	before: before<rule & string>
	regex: regex<rule & string>
	length: length<rule & number>
	predicate: predicate
}

type rawConstraint<input> = Bases<input[keyof input]>[keyof input &
	PrimitiveConstraintKind]

export type constraint<input extends ConstraintInput> = rawConstraint<input>
