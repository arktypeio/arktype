import type { Constraint, NodeSchema } from "@ark/schema"
import type {
	Branded,
	constrain,
	constraint,
	Constraints,
	Literal,
	Narrowed,
	normalizeLimit,
	normalizePrimitiveConstraintRoot
} from "../ast.ts"

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

export declare namespace Date {
	export type atOrAfter<rule> = constrain<Date, AtOrAfter<rule>>

	export type after<rule> = constrain<Date, After<rule>>

	export type atOrBefore<rule> = constrain<Date, AtOrBefore<rule>>

	export type before<rule> = constrain<Date, Before<rule>>

	export type narrowed = constrain<Date, Narrowed>

	export type branded<rule> = constrain<Date, Branded<rule>>

	export type literal<rule> = constrain<Date, Literal<rule>>

	export type is<constraints extends Constraints> = constrain<Date, constraints>

	export type afterSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? After<normalizeLimit<rule>>
		:	AtOrAfter<normalizeLimit<rule>>

	export type beforeSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? Before<normalizeLimit<rule>>
		:	AtOrBefore<normalizeLimit<rule>>

	export type parseConstraint<
		kind extends Constraint.PrimitiveKind,
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
