import type { Dict, extend } from "@arktype/util"
import { BasisImplementations, type BasisDeclarations } from "../bases/basis.js"
import type { PropKind } from "../refinements/props/prop.js"
import {
	RefinementNodes,
	type RefinementDeclarations
} from "../refinements/refinement.js"
import type { ValidatorKind } from "../sets/morph.js"
import {
	SetImplementationByKind,
	type SetDeclarationsByKind
} from "../sets/set.js"
import type { BranchKind } from "../sets/union.js"
import type { TraversalMethods } from "./compilation.js"
import type {
	ConstraintKind,
	NodeKind,
	RefinementKind,
	TypeKind
} from "./define.js"

export type ConstraintDeclarationsByKind = extend<
	BasisDeclarations,
	RefinementDeclarations
>

export const ConstraintImplementationByKind = {
	...BasisImplementations,
	...RefinementNodes
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

export type Schema<kind extends NodeKind> = Declaration<kind>["schema"]

export type ChildrenByKind = {
	[k in NodeKind]: k extends "union"
		? BranchKind
		: k extends "morph"
		  ? ValidatorKind
		  : k extends "intersection"
		    ? ConstraintKind
		    : k extends PropKind
		      ? TypeKind
		      : never
}

export type childKindOf<kind extends NodeKind> = ChildrenByKind[kind]

export type ParentsByKind = {
	[k in NodeKind]: {
		[pKind in NodeKind]: k extends childKindOf<pKind> ? pKind : never
	}[NodeKind]
}

export type parentKindOf<kind extends NodeKind> = ParentsByKind[kind]

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? TypeKind
	: kind extends "intersection"
	  ? ValidatorKind
	  : kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

export type Attachments<kind extends NodeKind> = Inner<kind> &
	Declaration<kind>["attach"] &
	TraversalMethods<
		kind extends RefinementKind ? Declaration<kind>["operand"] : unknown
	>
