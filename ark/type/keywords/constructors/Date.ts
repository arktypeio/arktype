import type {
	Branded,
	constrain,
	constraint,
	Constraints,
	Literal,
	Narrowed,
	normalizeLimit,
	Optional
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

	export type optional = constrain<Date, Optional>

	export type branded<rule> = constrain<Date, Branded<rule>>

	export type literal<rule> = constrain<Date, Literal<rule>>

	export type is<constraints extends Constraints> = constrain<Date, constraints>

	export type afterSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? After<normalizeLimit<rule>>
		:	AtOrAfter<normalizeLimit<rule>>

	export type beforeSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? Before<normalizeLimit<rule>>
		:	AtOrBefore<normalizeLimit<rule>>

	export type withConstraint<constraint> =
		constraint extends After<infer rule> ? after<rule>
		: constraint extends Before<infer rule> ? before<rule>
		: constraint extends AtOrAfter<infer rule> ? atOrAfter<rule>
		: constraint extends AtOrBefore<infer rule> ? atOrBefore<rule>
		: constraint extends Optional ? optional
		: constraint extends Narrowed ? narrowed
		: never
}
