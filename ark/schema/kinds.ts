import {
	type PredicateDeclaration,
	predicateImplementation,
	PredicateNode
} from "./constraints/predicate.js"
import {
	type IndexDeclaration,
	indexImplementation,
	IndexNode
} from "./constraints/props/index.js"
import {
	type PropDeclaration,
	propImplementation,
	PropNode
} from "./constraints/props/prop.js"
import {
	type SequenceDeclaration,
	sequenceImplementation,
	SequenceNode
} from "./constraints/props/sequence.js"
import {
	type DivisorDeclaration,
	divisorImplementation,
	DivisorNode
} from "./constraints/refinements/divisor.js"
import {
	boundClassesByKind,
	type BoundDeclarations,
	boundImplementationsByKind
} from "./constraints/refinements/kinds.js"
import {
	type RegexDeclaration,
	regexImplementation,
	RegexNode
} from "./constraints/refinements/regex.js"
import type { RawNode } from "./node.js"
import {
	type AliasDeclaration,
	aliasImplementation,
	AliasNode
} from "./schemas/alias.js"
import {
	type DomainDeclaration,
	domainImplementation,
	DomainNode
} from "./schemas/domain.js"
import {
	type IntersectionDeclaration,
	intersectionImplementation,
	IntersectionNode
} from "./schemas/intersection.js"
import {
	type MorphDeclaration,
	morphImplementation,
	type MorphInputKind,
	MorphNode
} from "./schemas/morph.js"
import {
	type ProtoDeclaration,
	protoImplementation,
	ProtoNode
} from "./schemas/proto.js"
import {
	type UnionDeclaration,
	unionImplementation,
	UnionNode
} from "./schemas/union.js"
import {
	type UnitDeclaration,
	unitImplementation,
	UnitNode
} from "./schemas/unit.js"
import type { NodeKind, UnknownNodeImplementation } from "./shared/implement.js"
import type { makeRootAndArrayPropertiesMutable } from "./shared/utils.js"

export interface NodeDeclarationsByKind extends BoundDeclarations {
	alias: AliasDeclaration
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

export const nodeImplementationsByKind: Record<
	NodeKind,
	UnknownNodeImplementation
> = {
	...boundImplementationsByKind,
	alias: aliasImplementation,
	domain: domainImplementation,
	unit: unitImplementation,
	proto: protoImplementation,
	union: unionImplementation,
	morph: morphImplementation,
	intersection: intersectionImplementation,
	divisor: divisorImplementation,
	regex: regexImplementation,
	predicate: predicateImplementation,
	prop: propImplementation,
	index: indexImplementation,
	sequence: sequenceImplementation
} satisfies Record<NodeKind, unknown> as never

export const nodeClassesByKind: Record<
	NodeKind,
	new (attachments: never) => RawNode
> = {
	...boundClassesByKind,
	alias: AliasNode,
	domain: DomainNode,
	unit: UnitNode,
	proto: ProtoNode,
	union: UnionNode,
	morph: MorphNode,
	intersection: IntersectionNode,
	divisor: DivisorNode,
	regex: RegexNode,
	predicate: PredicateNode,
	prop: PropNode,
	index: IndexNode,
	sequence: SequenceNode
} satisfies Record<NodeKind, typeof RawNode<any>> as never

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type NodeDef<kind extends NodeKind> = Declaration<kind>["def"]

export type NormalizedDef<kind extends NodeKind> =
	Declaration<kind>["normalizedDef"]

export type childKindOf<kind extends NodeKind> = Declaration<kind>["childKind"]

type ParentsByKind = {
	[k in NodeKind]: {
		[pKind in NodeKind]: k extends childKindOf<pKind> ? pKind : never
	}[NodeKind]
}

export type parentKindOf<kind extends NodeKind> = ParentsByKind[kind]

export type ioKindOf<kind extends NodeKind> =
	kind extends "morph" ? MorphInputKind : reducibleKindOf<kind>

export type Prerequisite<kind extends NodeKind> =
	Declaration<kind>["prerequisite"]

export type reducibleKindOf<kind extends NodeKind> =
	Declaration<kind>["reducibleTo"] extends NodeKind ?
		Declaration<kind>["reducibleTo"]
	:	kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

/** make nested arrays mutable while keeping nested nodes immutable */
export type MutableInner<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<Inner<kind>>

export type MutableNormalizedSchema<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<NormalizedDef<kind>>

export type errorContext<kind extends NodeKind> = Readonly<
	Declaration<kind>["errorContext"]
>
