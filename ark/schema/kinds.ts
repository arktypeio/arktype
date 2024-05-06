import type { array, listable } from "@arktype/util"
import type { BaseNode } from "./node.js"
import {
	type PredicateDeclaration,
	predicateImplementation,
	PredicateNode
} from "./predicate.js"
import {
	type DivisorDeclaration,
	divisorImplementation,
	DivisorNode
} from "./refinements/divisor.js"
import {
	boundClassesByKind,
	type BoundDeclarations,
	boundImplementationsByKind,
	type BoundNodesByKind
} from "./refinements/kinds.js"
import {
	type RegexDeclaration,
	regexImplementation,
	RegexNode
} from "./refinements/regex.js"
import {
	type AliasDeclaration,
	aliasImplementation,
	AliasNode
} from "./roots/alias.js"
import {
	type DomainDeclaration,
	domainImplementation,
	DomainNode
} from "./roots/domain.js"
import {
	type IntersectionDeclaration,
	intersectionImplementation,
	IntersectionNode
} from "./roots/intersection.js"
import {
	type MorphDeclaration,
	morphImplementation,
	MorphNode
} from "./roots/morph.js"
import {
	type ProtoDeclaration,
	protoImplementation,
	ProtoNode
} from "./roots/proto.js"
import {
	type UnionDeclaration,
	unionImplementation,
	UnionNode
} from "./roots/union.js"
import {
	type UnitDeclaration,
	unitImplementation,
	UnitNode
} from "./roots/unit.js"
import type {
	ConstraintKind,
	NodeKind,
	OpenNodeKind,
	RootKind,
	UnknownNodeImplementation
} from "./shared/implement.js"
import type { makeRootAndArrayPropertiesMutable } from "./shared/utils.js"
import {
	type IndexDeclaration,
	indexImplementation,
	IndexNode
} from "./structure/index.js"
import {
	type OptionalDeclaration,
	optionalImplementation,
	OptionalNode
} from "./structure/optional.js"
import {
	type RequiredDeclaration,
	requiredImplementation,
	RequiredNode
} from "./structure/required.js"
import {
	type SequenceDeclaration,
	sequenceImplementation,
	SequenceNode
} from "./structure/sequence.js"
import {
	type StructureDeclaration,
	structureImplementation,
	StructureNode
} from "./structure/structure.js"

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
	required: RequiredDeclaration
	optional: OptionalDeclaration
	index: IndexDeclaration
	regex: RegexDeclaration
	predicate: PredicateDeclaration
	structure: StructureDeclaration
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
	required: requiredImplementation,
	optional: optionalImplementation,
	index: indexImplementation,
	sequence: sequenceImplementation,
	structure: structureImplementation
} satisfies Record<NodeKind, unknown> as never

export const nodeClassesByKind: Record<
	NodeKind,
	new (attachments: never) => BaseNode
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
	required: RequiredNode,
	optional: OptionalNode,
	index: IndexNode,
	sequence: SequenceNode,
	structure: StructureNode
} satisfies Record<NodeKind, typeof BaseNode<any>> as never

interface NodesByKind extends BoundNodesByKind {
	alias: AliasNode
	union: UnionNode
	morph: MorphNode
	intersection: IntersectionNode
	unit: UnitNode
	proto: ProtoNode
	domain: DomainNode
	divisor: DivisorNode
	regex: RegexNode
	predicate: PredicateNode
	required: RequiredNode
	optional: OptionalNode
	index: IndexNode
	sequence: SequenceNode
	structure: StructureNode
}

export type Node<kind extends NodeKind> = NodesByKind[kind]

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type NodeSchema<kind extends NodeKind> = Declaration<kind>["schema"]

export type RootSchema<kind extends RootKind = RootKind> = NodeSchema<kind>

export type NormalizedSchema<kind extends NodeKind> =
	Declaration<kind>["normalizedSchema"]

export type childKindOf<kind extends NodeKind> = Declaration<kind>["childKind"]

export type Prerequisite<kind extends NodeKind> =
	Declaration<kind>["prerequisite"]

export type reducibleKindOf<kind extends NodeKind> =
	Declaration<kind>["reducibleTo"] extends NodeKind ?
		Declaration<kind>["reducibleTo"]
	:	kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

export type defAttachedAs<kind extends ConstraintKind> =
	kind extends OpenNodeKind ? listable<NodeSchema<kind>> : NodeSchema<kind>

export type innerAttachedAs<kind extends ConstraintKind> =
	kind extends OpenNodeKind ? array<Node<kind>> : Node<kind>

/** make nested arrays mutable while keeping nested nodes immutable */
export type MutableInner<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<Inner<kind>>

export type MutableNormalizedRoot<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<NormalizedSchema<kind>>

export type errorContext<kind extends NodeKind> = Readonly<
	Declaration<kind>["errorContext"]
>
