import type { array, listable } from "@arktype/util"
import type { BaseNode } from "./node.js"
import {
	PredicateNode,
	predicateImplementation,
	type PredicateDeclaration
} from "./predicate.js"
import {
	DivisorNode,
	divisorImplementation,
	type DivisorDeclaration
} from "./refinements/divisor.js"
import {
	boundClassesByKind,
	boundImplementationsByKind,
	type BoundDeclarations,
	type BoundNodesByKind
} from "./refinements/kinds.js"
import {
	RegexNode,
	regexImplementation,
	type RegexDeclaration
} from "./refinements/regex.js"
import {
	AliasNode,
	aliasImplementation,
	type AliasDeclaration
} from "./roots/alias.js"
import {
	DomainNode,
	domainImplementation,
	type DomainDeclaration
} from "./roots/domain.js"
import {
	IntersectionNode,
	intersectionImplementation,
	type IntersectionDeclaration
} from "./roots/intersection.js"
import {
	MorphNode,
	morphImplementation,
	type MorphDeclaration
} from "./roots/morph.js"
import {
	ProtoNode,
	protoImplementation,
	type ProtoDeclaration
} from "./roots/proto.js"
import {
	UnionNode,
	unionImplementation,
	type UnionDeclaration
} from "./roots/union.js"
import {
	UnitNode,
	unitImplementation,
	type UnitDeclaration
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
	IndexNode,
	indexImplementation,
	type IndexDeclaration
} from "./structure/index.js"
import {
	OptionalNode,
	optionalImplementation,
	type OptionalDeclaration
} from "./structure/optional.js"
import {
	RequiredNode,
	requiredImplementation,
	type RequiredDeclaration
} from "./structure/required.js"
import {
	SequenceNode,
	sequenceImplementation,
	type SequenceDeclaration
} from "./structure/sequence.js"
import {
	StructureNode,
	structureImplementation,
	type StructureDeclaration
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

export type errorContext<kind extends NodeKind> =
	Declaration<kind>["errorContext"]
