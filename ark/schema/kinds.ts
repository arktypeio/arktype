import {
	predicateImplementation,
	type PredicateDeclaration
} from "./constraints/predicate.js"
import type { IndexDeclaration } from "./constraints/props/index.js"
import type { PropDeclaration } from "./constraints/props/prop.js"
import {
	sequenceImplementation,
	type SequenceDeclaration
} from "./constraints/props/sequence.js"
import type { DivisorDeclaration } from "./constraints/refinements/divisor.js"
import {
	boundImplementationsByKind,
	type BoundDeclarations
} from "./constraints/refinements/kinds.js"
import type { RegexDeclaration } from "./constraints/refinements/regex.js"
import {
	divisorImplementation,
	indexImplementation,
	propImplementation,
	regexImplementation
} from "./main.js"
import {
	domainImplementation,
	type DomainDeclaration
} from "./schemas/domain.js"
import {
	intersectionImplementation,
	type IntersectionDeclaration
} from "./schemas/intersection.js"
import {
	morphImplementation,
	type MorphChildKind,
	type MorphDeclaration
} from "./schemas/morph.js"
import { protoImplementation, type ProtoDeclaration } from "./schemas/proto.js"
import { unionImplementation, type UnionDeclaration } from "./schemas/union.js"
import { unitImplementation, type UnitDeclaration } from "./schemas/unit.js"
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

export const nodeImplementationsByKind = {
	...boundImplementationsByKind,
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
}

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

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
