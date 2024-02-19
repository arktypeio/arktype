import type { evaluate, mutable } from "@arktype/util"
import type { Node } from "../base.js"
import type { LimitSchemaValue } from "../constraints/bounds.js"

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

export type is<t = unknown, constraints = Constraints> = {
	inferred: t
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

export type cast<to> = {
	[inferred]?: to
}

export type Preinferred = cast<unknown>
// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")
