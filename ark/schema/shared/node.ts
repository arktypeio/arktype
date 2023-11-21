import type { Dict, extend } from "@arktype/util"
import { BasisImplementations, type BasisDeclarations } from "../bases/basis.js"
import type { BaseNode, RootNode } from "../node.js"
import {
	RefinementImplementations,
	type RefinementDeclarations
} from "../refinements/refinement.js"
import {
	SetImplementationByKind,
	type SetDeclarationsByKind
} from "../sets/set.js"
import type { NodeKind, RootKind } from "./define.js"

export type ConstraintDeclarationsByKind = extend<
	BasisDeclarations,
	RefinementDeclarations
>

export const ConstraintImplementationByKind = {
	...BasisImplementations,
	...RefinementImplementations
}

export type NodeDeclarationsByKind = extend<
	ConstraintDeclarationsByKind,
	SetDeclarationsByKind
>

export const NodeImplementationByKind = {
	...SetImplementationByKind,
	...ConstraintImplementationByKind
} as const satisfies Dict<NodeKind>

export type NodeImplementationByKind = typeof NodeImplementationByKind

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type Implementation<kind extends NodeKind> =
	NodeImplementationByKind[kind]

export type ExpandedSchema<kind extends NodeKind> =
	Declaration<kind>["expandedSchema"]

export type CollapsedSchema<kind extends NodeKind> = kind extends unknown
	? Declaration<kind>["collapsedSchema" & keyof Declaration<kind>]
	: never

export type Schema<kind extends NodeKind> =
	| ExpandedSchema<kind>
	| CollapsedSchema<kind>

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

export type Attachments<kind extends NodeKind> = Declaration<kind>["attach"]

export type Node<
	kind extends NodeKind = NodeKind,
	t = unknown
> = kind extends RootKind ? RootNode<kind, t> : BaseNode<kind, t>
