import type { entriesOf, extend, listable } from "@arktype/util"
import type { BaseNode, Node } from "../base.js"
import type {
	NodeKind,
	OpenRefinementKind,
	RefinementKind
} from "../shared/define.js"
import type {
	Attachments,
	Declaration,
	Inner,
	Schema
} from "../shared/nodes.js"
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

export type RefinementOperand<kind extends RefinementKind> =
	Declaration<kind>["operand"]

export type RefinementIntersectionInputsByKind = {
	[k in RefinementKind]: k extends OpenRefinementKind
		? listable<Schema<k>>
		: Schema<k>
}

export type RefinementIntersectionInput<
	kind extends RefinementKind = RefinementKind
> = RefinementIntersectionInputsByKind[kind]

export type refinementKindOf<t> = {
	[k in RefinementKind]: t extends RefinementOperand<k> ? k : never
}[RefinementKind]

export type refinementInputsByKind<t> = {
	[k in refinementKindOf<t>]?: RefinementIntersectionInput<k>
}

export type RefinementKindNode<
	t,
	kind extends RefinementKind
> = BaseKindRefinementNode<t, kind> & Attachments<kind>

interface BaseKindRefinementNode<t, kind extends NodeKind> extends BaseNode<t> {
	kind: kind
	inner: Inner<kind>
	entries: entriesOf<Inner<kind>>
	// <childKindOf<kind>>
	children: Node[]
}

export interface DivisorNode extends RefinementKindNode<number, "divisor"> {}

export interface MinNode extends RefinementKindNode<number, "min"> {}

export interface MaxNode extends RefinementKindNode<number, "max"> {}

export interface MinLengthNode
	extends RefinementKindNode<string | readonly unknown[], "minLength"> {}

export interface MaxLengthNode
	extends RefinementKindNode<string | readonly unknown[], "maxLength"> {}

export interface AfterNode extends RefinementKindNode<Date, "after"> {}

export interface BeforeNode extends RefinementKindNode<Date, "before"> {}

export interface PatternNode extends RefinementKindNode<string, "pattern"> {}

export interface PredicateNode<t = unknown>
	extends RefinementKindNode<t, "predicate"> {}

export interface RequiredNode extends RefinementKindNode<object, "required"> {}

export interface OptionalNode extends RefinementKindNode<object, "optional"> {}
