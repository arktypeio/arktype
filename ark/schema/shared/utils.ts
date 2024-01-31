import {
	throwParseError,
	type PartialRecord,
	type evaluate
} from "@arktype/util"
import type { Node, TypeNode } from "../base.js"
import type { LimitSchemaValue } from "../refinements/bounds.js"
import type { ConditionalConstraintKind } from "../sets/intersection.js"
import type { BasisKind, NodeKind } from "./implement.js"

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

export type cast<to> = {
	[inferred]?: to
}

export type Preinferred = cast<unknown>
// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")
