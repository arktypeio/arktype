import type { extend, listable } from "@arktype/util"
import { type BaseNode, type rightOf } from "./base.ts"
import {
	type BasisClassesByKind,
	type BasisDeclarationsByKind,
	type BasisKind
} from "./bases/basis.ts"
import {
	type ConstraintDeclarationsByKind,
	type ConstraintImplementationByKind
} from "./constraints/constraint.ts"
import { type MorphSchema, type ValidatorSchema } from "./sets/morph.ts"
import {
	type SetClassesByKind,
	type SetDeclarationsByKind,
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

export type RuleClassesByKind = extend<
	BasisClassesByKind,
	ConstraintImplementationByKind
>

export type RuleKind = keyof RuleDeclarationsByKind

export type NodeDeclarationsByKind = extend<
	RuleDeclarationsByKind,
	SetDeclarationsByKind
>

export type RootKind = SetKind | BasisKind

export type NodeKind = keyof NodeDeclarationsByKind

export type NodeClassesByKind = extend<RuleClassesByKind, SetClassesByKind>

export type Schema<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["schema"]

export type DiscriminableSchemasByKind = {
	[k in NodeKind]: Extract<Schema<k>, { [_ in k]: unknown }>
}

export type DiscriminableSchema<kind extends NodeKind = NodeKind> =
	DiscriminableSchemasByKind[kind]

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
