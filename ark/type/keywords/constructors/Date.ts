import type {
	constraint,
	Default,
	Literal,
	Narrowed,
	Nominal,
	normalizeLimit,
	of,
	Optional
} from "../inference.ts"

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
	export type atOrAfter<rule> = of<Date, AtOrAfter<rule>>

	export type after<rule> = of<Date, After<rule>>

	export type atOrBefore<rule> = of<Date, AtOrBefore<rule>>

	export type before<rule> = of<Date, Before<rule>>

	export type narrowed = of<Date, Narrowed>

	export type optional = of<Date, Optional>

	export type defaultsTo<rule> = of<Date, Default<rule>>

	export type branded<rule> = of<Date, Nominal<rule>>

	export type literal<rule> = of<Date, Literal<rule>>

	export type is<attributes> = of<Date, attributes>

	export type afterSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? After<normalizeLimit<rule>>
		:	AtOrAfter<normalizeLimit<rule>>

	export type beforeSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? Before<normalizeLimit<rule>>
		:	AtOrBefore<normalizeLimit<rule>>

	export type applyAttribute<attribute> =
		attribute extends After<infer rule> ? after<rule>
		: attribute extends Before<infer rule> ? before<rule>
		: attribute extends AtOrAfter<infer rule> ? atOrAfter<rule>
		: attribute extends AtOrBefore<infer rule> ? atOrBefore<rule>
		: attribute extends Optional ? optional
		: attribute extends Default<infer rule> ? defaultsTo<rule>
		: attribute extends Nominal<infer rule> ? branded<rule>
		: never
}
