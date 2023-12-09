import type { evaluate, extend, listable } from "@arktype/util"
import type {
	MaxComparator,
	MinComparator
} from "arktype/internal/parser/string/reduce/shared.js"
import type { Declaration, Schema } from "../kinds.js"
import type { OpenRefinementKind, RefinementKind } from "../shared/define.js"
import {
	BoundNodes,
	type BoundDeclarations,
	type LimitSchemaValue
} from "./bounds.js"
import { DivisorNode, type DivisorDeclaration } from "./divisor.js"
import type { IndexDeclaration } from "./index.js"
import type { OptionalDeclaration } from "./optional.js"
import { PatternNode, type PatternDeclaration } from "./pattern.js"
import { PredicateNode, type PredicateDeclaration } from "./predicate.js"
import { PropNodes, type PropDeclarations } from "./prop.js"
import type { RequiredDeclaration } from "./required.js"
import type { SequenceDeclaration } from "./sequence.js"

export type ClosedRefinementDeclarations = extend<
	BoundDeclarations,
	{
		sequence: SequenceDeclaration
		divisor: DivisorDeclaration
	}
>

export type OpenRefinementDeclarations = {
	required: RequiredDeclaration
	optional: OptionalDeclaration
	index: IndexDeclaration
	pattern: PatternDeclaration
	predicate: PredicateDeclaration
}

export type RefinementDeclarations = extend<
	ClosedRefinementDeclarations,
	OpenRefinementDeclarations
>

export const RefinementNodes = {
	divisor: DivisorNode,
	pattern: PatternNode,
	predicate: PredicateNode,
	...BoundNodes,
	...PropNodes
} as const satisfies Record<RefinementKind, unknown>

export type RefinementOperand<kind extends RefinementKind> =
	Declaration<kind>["checks"]

export type Comparator = MinComparator | MaxComparator | "=="

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
