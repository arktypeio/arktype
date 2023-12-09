import type { evaluate, extend } from "@arktype/util"
import type { Declaration } from "../kinds.js"
import type { RefinementKind } from "../shared/define.js"
import {
	BoundNodes,
	type BoundDeclarations,
	type LimitSchemaValue
} from "./bounds.js"
import { DivisorNode, type DivisorDeclaration } from "./divisor.js"
import { IndexNode, type IndexDeclaration } from "./index.js"
import { OptionalNode, type OptionalDeclaration } from "./optional.js"
import { PatternNode, type PatternDeclaration } from "./pattern.js"
import { PredicateNode, type PredicateDeclaration } from "./predicate.js"
import { RequiredNode, type RequiredDeclaration } from "./required.js"
import { SequenceNode, type SequenceDeclaration } from "./sequence.js"

export type RefinementDeclarations = extend<
	BoundDeclarations,
	{
		sequence: SequenceDeclaration
		divisor: DivisorDeclaration
		required: RequiredDeclaration
		optional: OptionalDeclaration
		index: IndexDeclaration
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export const RefinementNodes = {
	...BoundNodes,
	divisor: DivisorNode,
	pattern: PatternNode,
	predicate: PredicateNode,
	required: RequiredNode,
	optional: OptionalNode,
	index: IndexNode,
	sequence: SequenceNode
} as const satisfies Record<RefinementKind, unknown>

export type RefinementOperand<kind extends RefinementKind> =
	Declaration<kind>["checks"]

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
