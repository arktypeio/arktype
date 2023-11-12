import type { extend, listable, requiredKeyOf } from "@arktype/util"
import { type BaseNode, type rightOf } from "./base.ts"
import {
	type BasisDeclarationsByKind,
	type BasisImplementationByKind,
	type BasisKind
} from "./bases/basis.ts"
import {
	type ConstraintDeclarationsByKind,
	type ConstraintImplementationByKind
} from "./constraints/constraint.ts"
import {
	type MorphSchema,
	type ValidatorKind,
	type ValidatorSchema
} from "./sets/morph.ts"
import {
	type SetDeclarationsByKind,
	type SetImplementationByKind,
	type SetKind
} from "./sets/set.ts"

export type RootInput = listable<ValidatorSchema | MorphSchema>

export type reifyIntersections<lKind extends NodeKind, intersectionMap> = {
	[rKind in keyof intersectionMap]: rKind extends "default"
		? (
				l: Node<lKind>,
				r: Node<Exclude<rightOf<lKind>, keyof intersectionMap>>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
		: (
				l: Node<lKind>,
				r: Node<rKind & NodeKind>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
}

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

export type RuleDeclarationsByKind = extend<
	BasisDeclarationsByKind,
	ConstraintDeclarationsByKind
>

export type RuleImplementationByKind = extend<
	BasisImplementationByKind,
	ConstraintImplementationByKind
>

export type RuleKind = keyof RuleDeclarationsByKind

export type NodeDeclarationsByKind = extend<
	RuleDeclarationsByKind,
	SetDeclarationsByKind
>

export type RootKind = SetKind | BasisKind

export type NodeKind = keyof NodeDeclarationsByKind

export type NodeImplementationByKind = extend<
	SetImplementationByKind,
	RuleImplementationByKind
>

export type Implementation<kind extends NodeKind> =
	NodeImplementationByKind[kind]

export type ExpandedSchema<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["expandedSchema"]

export type CollapsedSchema<kind extends NodeKind> = kind extends unknown
	? NodeDeclarationsByKind[kind]["collapsedSchema" &
			keyof NodeDeclarationsByKind[kind]]
	: never

export type Schema<kind extends NodeKind> =
	| ExpandedSchema<kind>
	| CollapsedSchema<kind>

export type Inner<kind extends NodeKind> = NodeDeclarationsByKind[kind]["inner"]

export type Attachments<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["attach"]

export type LeftIntersections<kind extends NodeKind> = reifyIntersections<
	kind,
	NodeDeclarationsByKind[kind]["intersections"]
>

export type Node<
	kind extends NodeKind = NodeKind,
	t = unknown
> = kind extends NodeKind ? BaseNode<kind, t> : never

export type Root<t = unknown, kind extends RootKind = RootKind> = Node<kind, t>
