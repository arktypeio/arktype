import type { ErrorMessage, conform, describe, evaluate } from "@arktype/util"
import type { Prerequisite, Schema } from "../kinds.js"
import type {
	BoundKind,
	writeInvalidOperandMessage
} from "../shared/implement.js"
import type { PrimitiveConstraintKind } from "./constraint.js"
import type { LimitSchemaValue, boundConstraints } from "./refinements/range.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type BoundConstraints = { [k in Comparator]?: LimitSchemaValue }

export type RegexLiteral<source extends string = string> = `/${source}/`

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type Constraints = evaluate<
	BoundConstraints & {
		[k: DateLiteral | RegexLiteral]: true
		"%"?: true
		":"?: true
	}
>

export type is<basis, constraints> = {
	basis: basis
	constraints: constraints
}

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

export type constrain<t, constraints extends Constraints> = t extends is<
	infer basis,
	infer lConstraints
>
	? is<basis, lConstraints & constraints>
	: is<t, constraints>

export type applySchema<
	t,
	kind extends PrimitiveConstraintKind,
	schema
> = constrain<t, schemaToConstraints<kind, conform<schema, Schema<kind>>>>

export type schemaToConstraints<
	kind extends PrimitiveConstraintKind,
	schema extends Schema<kind>
> = kind extends BoundKind ? boundConstraints<kind, schema> : {}
