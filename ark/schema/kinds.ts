import type { Dict, extend } from "@arktype/util"
import {
	RefinementNodes,
	type RefinementDeclarations
} from "./refinements/refinement.js"
import type {
	ConstraintKind,
	NodeKind,
	PropKind,
	TypeKind
} from "./shared/define.js"
import { BasisImplementations, type BasisDeclarations } from "./types/basis.js"
import {
	IntersectionNode,
	type IntersectionDeclaration
} from "./types/intersection.js"
import {
	MorphNode,
	type MorphDeclaration,
	type ValidatorKind
} from "./types/morph.js"
import {
	UnionNode,
	type BranchKind,
	type UnionDeclaration
} from "./types/union.js"

export type ConstraintDeclarationsByKind = extend<
	BasisDeclarations,
	RefinementDeclarations
>

export const ConstraintImplementationByKind = {
	...BasisImplementations,
	...RefinementNodes
}

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export const SetNodesByKind = {
	union: UnionNode,
	morph: MorphNode,
	intersection: IntersectionNode
}

export type NodeDeclarationsByKind = extend<
	ConstraintDeclarationsByKind,
	SetDeclarationsByKind
>

export const NodeImplementationByKind = {
	...SetNodesByKind,
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

export type ioKindOf<kind extends NodeKind> = kind extends "morph"
	? ValidatorKind
	: reducibleKindOf<kind>

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? TypeKind
	: kind extends "intersection"
	  ? ValidatorKind
	  : kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]
