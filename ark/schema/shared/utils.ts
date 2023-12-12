import type { evaluate } from "@arktype/util"
import type { LimitSchemaValue } from "../refinements/bounds.js"

export type Comparator = "<" | "<=" | ">" | ">=" | "=="

export type BoundRefinements = { [k in Comparator]?: LimitSchemaValue }

export type DivisorRefinements = { [k in `%${number}`]: 0 }

export type RegexLiteral<source extends string = string> = `/${source}/`

export type PatternRefinements = {
	[k in RegexLiteral]: true
}

export type DateLiteral<source extends string = string> =
	| `d"${source}"`
	| `d'${source}'`

export type DateRefinements = {
	[k in DateLiteral]: true
}

export type Refinements = evaluate<
	BoundRefinements &
		DivisorRefinements &
		PatternRefinements &
		DateRefinements & {
			anonymousDate?: true
			anonymousBounds?: true
			anonymousDivisor?: true
			anonymousPattern?: true
			anonymousPredicate?: true
		}
>

export type is<t = unknown, refinements = Refinements> = [t, ":?>", refinements]
