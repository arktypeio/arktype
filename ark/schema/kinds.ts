import type { Dict, extend } from "@arktype/util"
import { BoundNodes, type BoundDeclarations } from "./refinements/bounds.js"
import { DivisorNode, type DivisorDeclaration } from "./refinements/divisor.js"
import { IndexNode, type IndexDeclaration } from "./refinements/index.js"
import {
	OptionalNode,
	type OptionalDeclaration
} from "./refinements/optional.js"
import { PatternNode, type PatternDeclaration } from "./refinements/pattern.js"
import {
	PredicateNode,
	type PredicateDeclaration
} from "./refinements/predicate.js"
import {
	RequiredNode,
	type RequiredDeclaration
} from "./refinements/required.js"
import {
	SequenceNode,
	type SequenceDeclaration
} from "./refinements/sequence.js"
import type { BaseNodeDeclaration } from "./shared/declare.js"
import type {
	ConstraintKind,
	NodeKind,
	PropKind,
	RefinementKind,
	TypeKind
} from "./shared/define.js"
import { DomainNode, type DomainDeclaration } from "./types/domain.js"
import {
	IntersectionNode,
	type IntersectionDeclaration
} from "./types/intersection.js"
import {
	MorphNode,
	type MorphDeclaration,
	type ValidatorKind
} from "./types/morph.js"
import { ProtoNode, type ProtoDeclaration } from "./types/proto.js"
import {
	UnionNode,
	type BranchKind,
	type UnionDeclaration
} from "./types/union.js"
import { UnitNode, type UnitDeclaration } from "./types/unit.js"

export type NodeDeclarationsByKind = extend<
	BoundDeclarations,
	{
		domain: DomainDeclaration
		unit: UnitDeclaration
		proto: ProtoDeclaration
		union: UnionDeclaration
		morph: MorphDeclaration
		intersection: IntersectionDeclaration
		sequence: SequenceDeclaration
		divisor: DivisorDeclaration
		required: RequiredDeclaration
		optional: OptionalDeclaration
		index: IndexDeclaration
		pattern: PatternDeclaration
		predicate: PredicateDeclaration
	}
>

export const NodeImplementationByKind = {
	...BoundNodes,
	domain: DomainNode,
	unit: UnitNode,
	proto: ProtoNode,
	union: UnionNode,
	morph: MorphNode,
	intersection: IntersectionNode,
	divisor: DivisorNode,
	pattern: PatternNode,
	predicate: PredicateNode,
	required: RequiredNode,
	optional: OptionalNode,
	index: IndexNode,
	sequence: SequenceNode
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

export type hasOpenIntersection<d extends BaseNodeDeclaration> =
	null extends d["intersections"][d["kind"]] ? true : false

export type OpenRefinementKind = {
	[k in NodeKind]: hasOpenIntersection<Declaration<k>> extends true ? k : never
}[NodeKind]

export type ClosedRefinementKind = Exclude<RefinementKind, OpenRefinementKind>

export type RefinementOperand<kind extends RefinementKind> =
	Declaration<kind>["checks"]

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? TypeKind
	: kind extends "intersection"
	  ? ValidatorKind
	  : kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]
