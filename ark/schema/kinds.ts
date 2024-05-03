import type { array, listable } from "@arktype/util"
import {
	type PredicateDeclaration,
	predicateImplementation,
	PredicateNode
} from "./constraints/predicate.js"
import {
	type DivisorDeclaration,
	divisorImplementation,
	DivisorNode
} from "./constraints/refinement/divisor.js"
import {
	boundClassesByKind,
	type BoundDeclarations,
	boundImplementationsByKind,
	type BoundNodesByKind
} from "./constraints/refinement/kinds.js"
import {
	type RegexDeclaration,
	regexImplementation,
	RegexNode
} from "./constraints/refinement/regex.js"
import {
	type IndexDeclaration,
	indexImplementation,
	IndexNode
} from "./constraints/structure/index.js"
import {
	type OptionalDeclaration,
	optionalImplementation,
	OptionalNode
} from "./constraints/structure/optional.js"
import {
	type RequiredDeclaration,
	requiredImplementation,
	RequiredNode
} from "./constraints/structure/required.js"
import {
	type SequenceDeclaration,
	sequenceImplementation,
	SequenceNode
} from "./constraints/structure/sequence.js"
import {
	type StructureDeclaration,
	structureImplementation,
	StructureNode
} from "./constraints/structure/structure.js"
import type { BaseNode } from "./node.js"
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
import type {
	ConstraintKind,
	NodeKind,
	OpenNodeKind,
	SchemaKind,
	UnknownNodeImplementation
} from "./shared/implement.js"
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

export type NodeDef<kind extends NodeKind> = Declaration<kind>["def"]

export type SchemaDef<kind extends SchemaKind = SchemaKind> = NodeDef<kind>

export type NormalizedDef<kind extends NodeKind> =
	Declaration<kind>["normalizedDef"]

export type childKindOf<kind extends NodeKind> = Declaration<kind>["childKind"]

export type Prerequisite<kind extends NodeKind> =
	Declaration<kind>["prerequisite"]

export type reducibleKindOf<kind extends NodeKind> =
	Declaration<kind>["reducibleTo"] extends NodeKind ?
		Declaration<kind>["reducibleTo"]
	:	kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

export type defAttachedAs<kind extends ConstraintKind> =
	kind extends OpenNodeKind ? listable<NodeDef<kind>> : NodeDef<kind>

export type innerAttachedAs<kind extends ConstraintKind> =
	kind extends OpenNodeKind ? array<Node<kind>> : Node<kind>

/** make nested arrays mutable while keeping nested nodes immutable */
export type MutableInner<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<Inner<kind>>

export type MutableNormalizedSchema<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<NormalizedDef<kind>>

export type errorContext<kind extends NodeKind> = Readonly<
	Declaration<kind>["errorContext"]
>
