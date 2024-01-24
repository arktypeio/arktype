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

export type AnonymousRefinements =
	| "anonymousDate"
	| "anonymousBounds"
	| "anonymousDivisor"
	| "anonymousPattern"
	| "anonymousPredicate"

export type Refinements = evaluate<
	BoundRefinements &
		DivisorRefinements &
		PatternRefinements &
		DateRefinements & { [k in AnonymousRefinements]?: true }
>

export type is<t = unknown, refinements = Refinements> = {
	inferred: t
	refinements: refinements
}

export type intersectConstrainables<l, r> = [l, r] extends [
	is<infer lInner, infer lRefinements>,
	is<infer rInner, infer rRefinements>
]
	? is<lInner & rInner, lRefinements & rRefinements>
	: l extends is<infer lInner, infer lRefinements>
	? is<lInner & r, lRefinements>
	: r extends is<infer rInner, infer rRefinements>
	? is<l & rInner, rRefinements>
	: l & r

export type cast<to> = {
	[inferred]?: to
}

export type Preinferred = cast<unknown>
// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")
