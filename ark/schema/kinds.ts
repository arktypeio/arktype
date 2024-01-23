import type { extend } from "@arktype/util"
import type { NodeSubclass } from "./base.js"
import { DomainNode, type DomainDeclaration } from "./bases/domain.js"
import { ProtoNode, type ProtoDeclaration } from "./bases/proto.js"
import { UnitNode, type UnitDeclaration } from "./bases/unit.js"
import {
	PredicateNode,
	type PredicateDeclaration
} from "./predicates/predicate.js"
import { IndexNode, type IndexDeclaration } from "./props/index.js"
import { OptionalNode, type OptionalDeclaration } from "./props/optional.js"
import { RequiredNode, type RequiredDeclaration } from "./props/required.js"
import { SequenceNode, type SequenceDeclaration } from "./props/sequence.js"
import { BoundNodes, type BoundDeclarations } from "./refinements/bounds.js"
import { DivisorNode, type DivisorDeclaration } from "./refinements/divisor.js"
import { PatternNode, type PatternDeclaration } from "./refinements/pattern.js"
import {
	IntersectionNode,
	type IntersectionDeclaration
} from "./sets/intersection.js"
import {
	MorphNode,
	type MorphDeclaration,
	type ValidatorKind
} from "./sets/morph.js"
import {
	UnionNode,
	type BranchKind,
	type UnionDeclaration
} from "./sets/union.js"
import type { BaseNodeDeclaration } from "./shared/declare.js"
import type {
	ComponentKind,
	ConstraintKind,
	NodeKind,
	PropKind,
	TypeKind
} from "./shared/define.js"

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

export const nodesByKind = {
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
} as const satisfies { [k in NodeKind]: NodeSubclass<Declaration<k>> }

export type NodesByKind = typeof nodesByKind

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type Implementation<kind extends NodeKind> = NodesByKind[kind]

export type Schema<kind extends NodeKind> = Declaration<kind>["schema"]

export type NormalizedSchema<kind extends NodeKind> =
	Declaration<kind>["normalizedSchema"]

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

export type OpenComponentKind = {
	[k in NodeKind]: hasOpenIntersection<Declaration<k>> extends true ? k : never
}[NodeKind]

export type ClosedComponentKind = Exclude<ComponentKind, OpenComponentKind>

export type Prerequisite<kind extends NodeKind> =
	Declaration<kind>["prerequisite"]

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? TypeKind
	: kind extends "intersection"
	? ValidatorKind
	: kind

export type Inner<kind extends NodeKind> = Readonly<Declaration<kind>["inner"]>

export type ExpectedContext<kind extends NodeKind> = Readonly<
	Declaration<kind>["expectedContext"]
>
