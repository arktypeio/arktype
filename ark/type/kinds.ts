import type { NodeSubclass } from "./base.js"
import {
	PredicateNode,
	type PredicateDeclaration
} from "./constraints/predicate.js"
import { IndexNode, type IndexDeclaration } from "./constraints/props/index.js"
import {
	OptionalNode,
	type OptionalDeclaration
} from "./constraints/props/optional.js"
import {
	RequiredNode,
	type RequiredDeclaration
} from "./constraints/props/required.js"
import {
	SequenceNode,
	type SequenceDeclaration
} from "./constraints/props/sequence.js"
import type { DivisorDeclaration } from "./constraints/refinements/divisor.js"
import {
	BoundNodes,
	type BoundDeclarations
} from "./constraints/refinements/kinds.js"
import {
	RegexNode,
	type RegexDeclaration
} from "./constraints/refinements/regex.js"
import type { NodeKind } from "./shared/implement.js"
import type { makeRootAndArrayPropertiesMutable } from "./shared/utils.js"
import { DomainNode, type DomainDeclaration } from "./types/domain.js"
import {
	IntersectionNode,
	type IntersectionDeclaration
} from "./types/intersection.js"
import {
	MorphNode,
	type MorphChildKind,
	type MorphDeclaration
} from "./types/morph.js"
import { ProtoNode, type ProtoDeclaration } from "./types/proto.js"
import { UnionNode, type UnionDeclaration } from "./types/union.js"
import { UnitNode, type UnitDeclaration } from "./types/unit.js"

export interface NodeDeclarationsByKind extends BoundDeclarations {
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
	regex: RegexDeclaration
	predicate: PredicateDeclaration
}

export const nodesByKind = {
	...BoundNodes,
	domain: DomainNode,
	unit: UnitNode,
	proto: ProtoNode,
	union: UnionNode,
	morph: MorphNode,
	intersection: IntersectionNode,
	divisor: DivisorNode,
	regex: RegexNode,
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

export type childKindOf<kind extends NodeKind> = Declaration<kind>["childKind"]

type ParentsByKind = {
	[k in NodeKind]: {
		[pKind in NodeKind]: k extends childKindOf<pKind> ? pKind : never
	}[NodeKind]
}

export type parentKindOf<kind extends NodeKind> = ParentsByKind[kind]

export type ioKindOf<kind extends NodeKind> = kind extends "morph"
	? MorphChildKind
	: reducibleKindOf<kind>

export type Prerequisite<kind extends NodeKind> =
	Declaration<kind>["prerequisite"]

export type reducibleKindOf<kind extends NodeKind> =
	Declaration<kind>["reducibleTo"] extends NodeKind
		? Declaration<kind>["reducibleTo"]
		: kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

/** make nested arrays mutable while keeping nested nodes immutable */
export type MutableInner<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<Inner<kind>>

export type MutableNormalizedSchema<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<NormalizedSchema<kind>>

export type errorContext<kind extends NodeKind> = Readonly<
	Declaration<kind>["errorContext"]
>
