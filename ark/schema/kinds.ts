import {
	domainDescriptions,
	domainOf,
	flatMorph,
	objectKindDescriptions,
	printable,
	printKind,
	withAlphabetizedKeys,
	type array
} from "@ark/util"
import type { ResolvedConfig, ResolvedUnknownNodeConfig } from "./config.ts"
import type { BaseNode } from "./node.ts"
import { Predicate } from "./predicate.ts"
import { Divisor } from "./refinements/divisor.ts"
import {
	boundClassesByKind,
	boundImplementationsByKind,
	type BoundDeclarations,
	type BoundNodesByKind
} from "./refinements/kinds.ts"
import { Pattern } from "./refinements/pattern.ts"
import { Alias } from "./roots/alias.ts"
import { Domain } from "./roots/domain.ts"
import { Intersection } from "./roots/intersection.ts"
import { Morph } from "./roots/morph.ts"
import { Proto } from "./roots/proto.ts"
import { Union } from "./roots/union.ts"
import { Unit } from "./roots/unit.ts"
import type { BaseScope } from "./scope.ts"
import type { BaseNodeInput } from "./shared/declare.ts"
import { enInfo } from "./shared/enWriters.ts"
import { errorWriters, errorWritersByCode } from "./shared/errorWriters.ts"
import {
	ArkErrors,
	type ArkErrorCode,
	type ErrorContextsByCode
} from "./shared/errors.ts"
import type {
	ConstraintKind,
	NodeKind,
	OpenNodeKind,
	UnknownAttachmentsInput,
	UnknownNodeImplementation
} from "./shared/implement.ts"
import { describeMissing, type Locale } from "./shared/locale.ts"
import { $ark } from "./shared/registry.ts"
import { ToJsonSchema } from "./shared/toJsonSchema.ts"
import {
	describeBranches,
	type makeRootAndArrayPropertiesMutable
} from "./shared/utils.ts"
import { Index } from "./structure/index.ts"
import { Optional } from "./structure/optional.ts"
import { Required } from "./structure/required.ts"
import { Sequence } from "./structure/sequence.ts"
import { Structure } from "./structure/structure.ts"

export interface NodeDeclarationsByKind extends BoundDeclarations {
	alias: Alias.Declaration
	domain: Domain.Declaration
	unit: Unit.Declaration
	proto: Proto.Declaration
	union: Union.Declaration
	morph: Morph.Declaration
	intersection: Intersection.Declaration
	sequence: Sequence.Declaration
	divisor: Divisor.Declaration
	required: Required.Declaration
	optional: Optional.Declaration
	index: Index.Declaration
	pattern: Pattern.Declaration
	predicate: Predicate.Declaration
	structure: Structure.Declaration
}

export const nodeImplementationsByKind: Record<
	NodeKind,
	UnknownNodeImplementation
> = {
	...boundImplementationsByKind,
	alias: Alias.implementation,
	domain: Domain.implementation,
	unit: Unit.implementation,
	proto: Proto.implementation,
	union: Union.implementation,
	morph: Morph.implementation,
	intersection: Intersection.implementation,
	divisor: Divisor.implementation,
	pattern: Pattern.implementation,
	predicate: Predicate.implementation,
	required: Required.implementation,
	optional: Optional.implementation,
	index: Index.implementation,
	sequence: Sequence.implementation,
	structure: Structure.implementation
} satisfies Record<NodeKind, unknown> as never

const describeRequired: Locale.ExpectedWriter<"required"> = (e, locale) =>
	describeMissing(e.missing, locale)

// a leaf error carries its node's inner fields, so the node's description
// writer describes it, while union and intersection have their own and
// required describes what is missing
const enWritersOf = (
	kind: NodeKind,
	defaults: ResolvedUnknownNodeConfig
): Locale.CodeWriters => {
	const writers: Record<string, unknown> = {
		expected:
			kind === "union" || kind === "intersection" ? defaults.expected
			: kind === "required" ? describeRequired
			: defaults.description,
		problem: defaults.problem
	}
	for (const slot of ["actual", "message"] as const)
		if (defaults[slot] !== errorWriters[slot]) writers[slot] = defaults[slot]
	return writers as never
}

const listCases: Locale.ExpectedWriter<"discriminant"> = (e, locale) =>
	describeBranches(
		e.discriminantKind === "domain" ?
			e.cases.map(domain => locale.nouns[domain])
		:	e.cases.map(unit => printable(unit, { ownDataOnly: true }))
	)

const describeDiscriminant: Locale.ActualWriter<"discriminant"> = (
	data,
	e,
	locale
) =>
	e.absent ? "missing"
	: e.discriminantKind === "domain" ? locale.nouns[domainOf(data)]
	: printKind(data)

export const en: Locale.Complete = {
	...(flatMorph(nodeImplementationsByKind, (kind, { ownErr, defaults }) =>
		ownErr ? [kind, enWritersOf(kind, defaults)] : []
	) as Pick<Locale.Complete, ArkErrorCode & NodeKind>),
	undeclared: {
		...errorWritersByCode.undeclared,
		problem: errorWriters.problem
	},
	discriminant: {
		expected: listCases,
		problem: errorWriters.problem,
		actual: describeDiscriminant
	},
	...enInfo,
	cite: text => text,
	// a domain is named by its noun whatever its meta, as DomainNode's
	// brief does
	basis: (basis, locale) =>
		basis.code === "domain" ? locale.nouns[basis.domain]
		: basis.meta.description === undefined ?
			nodeImplementationsByKind[basis.code].defaults.description(basis as never)
		:	locale.cite(basis.meta.description),
	nouns: {
		...domainDescriptions,
		...objectKindDescriptions,
		unknown: "present",
		never: "never"
	},
	keywordPhrases: {},
	actual: errorWriters.actual,
	problem: errorWriters.problem,
	message: errorWriters.message
}

$ark.defaultConfig = withAlphabetizedKeys(
	Object.assign(
		flatMorph(nodeImplementationsByKind, (kind, implementation) => [
			kind,
			implementation.defaults
		]),
		{
			undeclared: { ...errorWriters, ...errorWritersByCode.undeclared },
			discriminant: { ...errorWriters, ...errorWritersByCode.discriminant },
			jitless: false,
			onUndeclaredKey: "ignore",
			exactOptionalPropertyTypes: true,
			numberAllowsNaN: false,
			numberAllowsInfinity: false,
			dateAllowsInvalid: false,
			mutatesInput: false,
			onFail: null,
			errors: "all",
			keywords: {},
			toJsonSchema: ToJsonSchema.defaultConfig,
			locale: en
		} satisfies Omit<ResolvedConfig, NodeKind>
	) as never
)

// Node prints errors as their issues, set where runtime bundles never load
Object.defineProperty(
	ArkErrors.prototype,
	Symbol.for("nodejs.util.inspect.custom"),
	{
		value(this: ArkErrors) {
			return this.issues
		}
	}
)

export const nodeClassesByKind: Record<
	NodeKind,
	new (attachments: UnknownAttachmentsInput, $: BaseScope) => BaseNode
> = {
	...boundClassesByKind,
	alias: Alias.Node,
	domain: Domain.Node,
	unit: Unit.Node,
	proto: Proto.Node,
	union: Union.Node,
	morph: Morph.Node,
	intersection: Intersection.Node,
	divisor: Divisor.Node,
	pattern: Pattern.Node,
	predicate: Predicate.Node,
	required: Required.Node,
	optional: Optional.Node,
	index: Index.Node,
	sequence: Sequence.Node,
	structure: Structure.Node
} satisfies Record<NodeKind, typeof BaseNode<any>> as never

interface NodesByKind extends BoundNodesByKind {
	alias: Alias.Node
	union: Union.Node
	morph: Morph.Node
	intersection: Intersection.Node
	unit: Unit.Node
	proto: Proto.Node
	domain: Domain.Node
	divisor: Divisor.Node
	pattern: Pattern.Node
	predicate: Predicate.Node
	required: Required.Node
	optional: Optional.Node
	index: Index.Node
	sequence: Sequence.Node
	structure: Structure.Node
}

export type nodeOfKind<kind extends NodeKind> = NodesByKind[kind]

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type childKindOf<kind extends NodeKind> = Declaration<kind>["childKind"]

export type Prerequisite<kind extends NodeKind> =
	Declaration<kind>["prerequisite"]

export type reducibleKindOf<kind extends NodeKind> =
	Declaration<kind>["reducibleTo"] extends NodeKind ?
		Declaration<kind>["reducibleTo"]
	:	kind

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

// a node is created from its inner and its meta
export type NodeInput<kind extends NodeKind = NodeKind> =
	kind extends "union" ? Union.Input
	: kind extends "structure" ? Structure.Input
	: Inner<kind> & BaseNodeInput

export type innerAttachedAs<kind extends ConstraintKind> =
	kind extends OpenNodeKind ? array<nodeOfKind<kind>> : nodeOfKind<kind>

/** make nested arrays mutable while keeping nested nodes immutable */
export type mutableInnerOfKind<kind extends NodeKind> =
	makeRootAndArrayPropertiesMutable<Inner<kind>>

export type errorCtx<code extends ArkErrorCode> = ErrorContextsByCode[code]

export type NodeErrorContextsByKind = {
	[kind in NodeKind as Declaration<kind>["errorCtx"] extends null ? never
	:	kind]: Declaration<kind>["errorCtx"]
}
