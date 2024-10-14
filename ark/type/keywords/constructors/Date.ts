import type {
	After,
	Anonymous,
	AtOrAfter,
	AtOrBefore,
	AttributeKind,
	Attributes,
	Before,
	brand,
	Default,
	Nominal,
	normalizeLimit,
	of,
	Optional
} from "../../attributes.ts"

export declare namespace Date {
	export type atOrAfter<rule> = of<Date, AtOrAfter<rule>>

	export type after<rule> = of<Date, After<rule>>

	export type atOrBefore<rule> = of<Date, AtOrBefore<rule>>

	export type before<rule> = of<Date, Before<rule>>

	export type anonymous = of<Date, Anonymous>

	export type nominal<rule> = of<Date, Nominal<rule>>

	export type optional = of<Date, Optional>

	export type defaultsTo<rule> = of<Date, Default<rule>>

	export type is<attributes> = of<Date, attributes>

	export type afterSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? After<normalizeLimit<rule>>
		:	AtOrAfter<normalizeLimit<rule>>

	export type beforeSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? Before<normalizeLimit<rule>>
		:	AtOrBefore<normalizeLimit<rule>>

	export type AttributableKind = AttributeKind.defineAttributable<
		"after" | "atOrAfter" | "before" | "atOrBefore"
	>

	export type withSingleAttribute<
		kind extends AttributableKind,
		value extends Attributes[kind]
	> = raw.withSingleAttribute<kind, value>

	export namespace raw {
		export type withSingleAttribute<kind, value> =
			kind extends "nominal" ? nominal<value>
			: kind extends "after" ? after<value>
			: kind extends "atOrAfter" ? atOrAfter<value>
			: kind extends "before" ? before<value>
			: kind extends "atOrBefore" ? atOrBefore<value>
			: kind extends "optional" ? optional
			: kind extends "defaultsTo" ? defaultsTo<value>
			: never
	}

	export type branded<rule> = brand<Date, Nominal<rule>>

	export namespace branded {
		export type atOrAfter<rule> = brand<Date, AtOrAfter<rule>>

		export type after<rule> = brand<Date, After<rule>>

		export type atOrBefore<rule> = brand<Date, AtOrBefore<rule>>

		export type before<rule> = brand<Date, Before<rule>>

		export type anonymous = brand<Date, Anonymous>

		export type is<attributes> = brand<Date, attributes>

		export type withSingleAttribute<
			kind extends AttributableKind,
			value extends Attributes[kind]
		> = raw.withSingleAttribute<kind, value>

		export namespace raw {
			export type withSingleAttribute<kind, value> =
				kind extends "nominal" ? nominal<value>
				: kind extends "after" ? after<value>
				: kind extends "atOrAfter" ? atOrAfter<value>
				: kind extends "before" ? before<value>
				: kind extends "atOrBefore" ? atOrBefore<value>
				: never
		}
	}
}
