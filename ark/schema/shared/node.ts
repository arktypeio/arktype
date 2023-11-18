import type { Dict, extend } from "@arktype/util"
import { BasisImplementations, type BasisDeclarations } from "../bases/basis.ts"
import {
	ConstraintImplementations,
	type ConstraintDeclarations
} from "../constraints/constraint.ts"
import type { BaseNode } from "../node.ts"
import type { RootNode } from "../root.ts"
import {
	SetImplementationByKind,
	type SetDeclarationsByKind
} from "../sets/set.ts"
import type { NodeKind, RootKind } from "./define.ts"

export type RuleDeclarationsByKind = extend<
	BasisDeclarations,
	ConstraintDeclarations
>

export const RuleImplementationByKind = {
	...BasisImplementations,
	...ConstraintImplementations
}

export type NodeDeclarationsByKind = extend<
	RuleDeclarationsByKind,
	SetDeclarationsByKind
>

export const NodeImplementationByKind = {
	...SetImplementationByKind,
	...RuleImplementationByKind
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
