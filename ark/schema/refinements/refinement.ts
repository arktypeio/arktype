import type { extend, listable } from "@arktype/util"
import type { OpenRefinementKind, RefinementKind } from "../shared/define.js"
import type { Declaration, Definition } from "../shared/nodes.js"
import { BoundImplementations, type BoundDeclarations } from "./bounds.js"
import { DivisorImplementation, type DivisorDeclaration } from "./divisor.js"
import { PatternImplementation, type PatternDeclaration } from "./pattern.js"
import {
	PredicateImplementation,
	type PredicateDeclaration
} from "./predicate.js"
import { PropImplementations, type PropDeclarations } from "./props/prop.js"

export type ClosedRefinementDeclarations = extend<
	BoundDeclarations,
	{
		divisor: DivisorDeclaration
	}
>

export type OpenRefinementDeclarations = extend<
	PropDeclarations,
	{
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export type RefinementDeclarations = extend<
	ClosedRefinementDeclarations,
	OpenRefinementDeclarations
>

export const RefinementImplementations = {
	divisor: DivisorImplementation,
	pattern: PatternImplementation,
	predicate: PredicateImplementation,
	...BoundImplementations,
	...PropImplementations
} as const satisfies Record<RefinementKind, unknown>

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: k extends OpenRefinementKind
		? listable<Definition<k>>
		: Definition<k>
}

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export type refinementKindOf<t> = {
	[k in RefinementKind]: t extends Declaration<k>["operands"] ? k : never
}[RefinementKind]

export type refinementInputsByKind<t> = {
	[k in refinementKindOf<t>]?: RefinementIntersectionInput<k>
}
