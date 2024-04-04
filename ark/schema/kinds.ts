import type { NodeSubclass } from "./base.js"
import {
	type PredicateDeclaration,
	PredicateNode
} from "./constraints/predicate.js"
import { type IndexDeclaration, IndexNode } from "./constraints/props/index.js"
import { type PropDeclaration, PropNode } from "./constraints/props/prop.js"
import {
	type SequenceDeclaration,
	SequenceNode
} from "./constraints/props/sequence.js"
import {
	type DivisorDeclaration,
	DivisorNode
} from "./constraints/refinements/divisor.js"
import {
	type BoundDeclarations,
	BoundNodes
} from "./constraints/refinements/kinds.js"
import {
	type RegexDeclaration,
	RegexNode
} from "./constraints/refinements/regex.js"
import { BaseSchema } from "./main.js"
import { type DomainDeclaration, DomainNode } from "./schemas/domain.js"
import {
	type IntersectionDeclaration,
	IntersectionNode
} from "./schemas/intersection.js"
import {
	type MorphChildKind,
	type MorphDeclaration,
	MorphNode
} from "./schemas/morph.js"
import type { ProtoDeclaration } from "./schemas/proto.js"
import { type UnionDeclaration, UnionNode } from "./schemas/union.js"
import { type UnitDeclaration, UnitNode } from "./schemas/unit.js"
import type { NodeKind } from "./shared/implement.js"
import type { makeRootAndArrayPropertiesMutable } from "./shared/utils.js"

export interface NodeDeclarationsByKind extends BoundDeclarations {
	domain: DomainDeclaration
	unit: UnitDeclaration
	proto: ProtoDeclaration
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
	sequence: SequenceDeclaration
	divisor: DivisorDeclaration
	prop: PropDeclaration
	index: IndexDeclaration
	regex: RegexDeclaration
	predicate: PredicateDeclaration
}

export const nodeClassesByKind = {
	...BoundNodes,
	domain: DomainNode,
	unit: UnitNode,
	// TODO: fix
	proto: BaseSchema as never,
	union: UnionNode,
	morph: MorphNode,
	intersection: IntersectionNode,
	divisor: DivisorNode,
	regex: RegexNode,
	predicate: PredicateNode,
	prop: PropNode,
	index: IndexNode,
	sequence: SequenceNode
} satisfies { [k in NodeKind]: NodeSubclass<Declaration<k>> }

export type NodeClassesByKind = typeof nodeClassesByKind

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type Implementation<kind extends NodeKind> = NodeClassesByKind[kind]

export type NodeDef<kind extends NodeKind> = Declaration<kind>["def"]

export type NormalizedSchema<kind extends NodeKind> =
	Declaration<kind>["normalizedDef"]

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
