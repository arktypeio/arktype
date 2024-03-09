import {
	compileSerializedValue,
	morph,
	throwParseError,
	type ErrorMessage,
	type JsonData,
	type Stringifiable,
	type entryOf,
	type evaluate,
	type indexOf,
	type listable,
	type requireKeys
} from "@arktype/util"
import type { Node, TypeNode, UnknownNode } from "../base.js"
import { boundKinds } from "../constraints/refinements/shared.js"
import type { Declaration, Inner, errorContext } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type {
	NodeConfig,
	ParsedUnknownNodeConfig,
	ScopeNode
} from "../scope.js"
import type { typeKindOrRightOf, typeKindRightOf } from "../types/type.js"
import type {
	BaseErrorContext,
	BaseMeta,
	BaseNodeDeclaration
} from "./declare.js"
import type { Disjoint } from "./disjoint.js"

export {
	type BoundKind,
	type RangeKind
} from "../constraints/refinements/shared.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const propKinds = ["required", "optional", "index", "sequence"] as const

export type PropKind = (typeof propKinds)[number]

export const refinementKinds = ["regex", "divisor", ...boundKinds] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const constraintKinds = [
	...refinementKinds,
	...propKinds,
	"predicate"
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const typeKinds = [
	"union",
	"morph",
	"unit",
	"intersection",
	"proto",
	"domain"
] as const

export type TypeKind = (typeof typeKinds)[number]

export const intersectionChildKinds = [
	"proto",
	"domain",
	...constraintKinds
] as const

export type IntersectionChildKind = (typeof intersectionChildKinds)[number]

export type NodeKind = TypeKind | ConstraintKind

export const nodeKinds = [
	...typeKinds,
	...refinementKinds,
	...propKinds,
	"predicate"
] as const satisfies NodeKind[]

export type OpenNodeKind = {
	[k in NodeKind]: Declaration<k>["hasOpenIntersection"] extends true
		? k
		: never
}[NodeKind]

export type ClosedNodeKind = Exclude<NodeKind, OpenNodeKind>

export const primitiveKinds = [
	...basisKinds,
	...refinementKinds,
	"predicate"
] as const

export type PrimitiveKind = (typeof primitiveKinds)[number]

export type CompositeKind = Exclude<NodeKind, PrimitiveKind>

export type OrderedNodeKinds = typeof nodeKinds

type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

export type kindOrRightOf<kind extends NodeKind> = kind | kindRightOf<kind>

export type kindLeftOf<kind extends NodeKind> = Exclude<
	NodeKind,
	kindOrRightOf<kind>
>

export type kindOrLeftOf<kind extends NodeKind> = kind | kindLeftOf<kind>

type accumulateRightKinds<
	remaining extends readonly NodeKind[],
	result
> = remaining extends readonly [
	infer head extends NodeKind,
	...infer tail extends NodeKind[]
]
	? accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	: result

export type ConstraintIntersection<
	lKind extends ConstraintKind,
	rKind extends kindOrRightOf<lKind>
> = (l: Node<lKind>, r: Node<rKind>, $: ScopeNode) => Node | Disjoint | null

export type ConstraintIntersectionMap<kind extends ConstraintKind> = evaluate<
	{
		[_ in kind]: ConstraintIntersection<kind, kind>
	} & {
		[rKind in kindRightOf<kind>]?: ConstraintIntersection<kind, rKind>
	}
>

export type TypeIntersection<
	lKind extends TypeKind,
	rKind extends typeKindOrRightOf<lKind>
> = (l: Node<lKind>, r: Node<rKind>, $: ScopeNode) => TypeNode | Disjoint

export type TypeIntersectionMap<kind extends TypeKind> = {
	[rKind in typeKindOrRightOf<kind>]: TypeIntersection<kind, rKind>
}

export type IntersectionMap<kind extends NodeKind> = kind extends TypeKind
	? TypeIntersectionMap<kind>
	: ConstraintIntersectionMap<kind & ConstraintKind>

export type UnknownIntersectionMap = {
	[k in NodeKind]?: (
		l: UnknownNode,
		r: UnknownNode,
		$: ScopeNode
	) => UnknownIntersectionResult
}

export type UnknownIntersectionResult = Node | Disjoint | null

type PrecedenceByKind = {
	[i in indexOf<OrderedNodeKinds> as OrderedNodeKinds[i]]: i
}

const precedenceByKind = morph(
	nodeKinds,
	(i, kind) => [kind, i] as entryOf<PrecedenceByKind>
)

export type precedenceOfKind<kind extends NodeKind> = PrecedenceByKind[kind]

export const precedenceOfKind = <kind extends NodeKind>(kind: kind) =>
	precedenceByKind[kind]

export type kindRightOf<kind extends NodeKind> = RightsByKind[kind]

export const typeKindsRightOf = <kind extends TypeKind>(kind: kind) =>
	typeKinds.slice(precedenceOfKind(kind) + 1) as typeKindRightOf<kind>[]

export type KeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in keyRequiringDefinition<d>]: NodeKeyImplementation<d, k>
}

type keyRequiringDefinition<d extends BaseNodeDeclaration> = Exclude<
	keyof d["normalizedSchema"],
	keyof BaseMeta
>

export const defaultValueSerializer = (v: unknown) => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	) {
		return v
	}
	return compileSerializedValue(v)
}

export type NodeKeyImplementation<
	d extends BaseNodeDeclaration,
	k extends keyof d["normalizedSchema"],
	instantiated = k extends keyof d["inner"] ? d["inner"][k] : never
> = requireKeys<
	{
		preserveUndefined?: true
		meta?: true
		child?: true
		implied?: true
		serialize?: (
			schema: instantiated extends listable<UnknownNode> | undefined
				? ErrorMessage<`Keys with node children cannot specify a custom serializer`>
				: instantiated
		) => JsonData
		parse?: (
			schema: Exclude<d["normalizedSchema"][k], undefined>,
			ctx: SchemaParseContext
		) => instantiated
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	| (d["normalizedSchema"][k] extends instantiated ? never : "parse")
	// require keys containing children specify it
	| ([instantiated] extends [listable<UnknownNode> | undefined]
			? "child"
			: never)
>

interface CommonNodeImplementationInput<d extends BaseNodeDeclaration> {
	keys: KeyDefinitions<d>
	normalize: (schema: d["schema"]) => d["normalizedSchema"]
	hasAssociatedError: d["errorContext"] extends null ? false : true
	collapseKey?: keyof d["inner"] & string
	reduce?: (
		inner: d["inner"],
		$: ScopeNode
	) => Node<d["reducibleTo"]> | Disjoint | undefined
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<BaseNodeDeclaration> {
	defaults: ParsedUnknownNodeConfig
	hasOpenIntersection: boolean
	intersections: UnknownIntersectionMap
	keys: Record<string, NodeKeyImplementation<any, any>>
}

export type nodeImplementationOf<d extends BaseNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		intersections: IntersectionMap<d["kind"]>
		hasOpenIntersection: d["hasOpenIntersection"]
		defaults: nodeDefaultsImplementationFor<d["kind"]>
	}

export type nodeImplementationInputOf<d extends BaseNodeDeclaration> =
	CommonNodeImplementationInput<d> & {
		intersections: IntersectionMap<d["kind"]>
		defaults: nodeDefaultsImplementationInputFor<d["kind"]>
	} & (d["hasOpenIntersection"] extends true
			? { hasOpenIntersection: true }
			: {}) &
		// if the node is declared as reducible to a kind other than its own,
		// there must be a reduce implementation
		(d["reducibleTo"] extends d["kind"] ? {} : { reduce: {} })

type nodeDefaultsImplementationInputFor<kind extends NodeKind> = requireKeys<
	NodeConfig<kind>,
	| "description"
	// if the node's error context is distinct from its inner definition, ensure it is implemented.
	// this occurs for nodes like `union` where the error that occurs is not 1:1 with the existing node,
	// but rather a single failed condition for each branch.
	| (Inner<kind> extends Omit<
			errorContext<kind>,
			keyof BaseErrorContext | "description"
	  >
			? never
			: "expected" & keyof NodeConfig<kind>)
>

export type nodeDefaultsImplementationFor<kind extends NodeKind> = Required<
	NodeConfig<kind>
>

export type DescriptionWriter<kind extends NodeKind = NodeKind> = (
	inner: Node<kind>
) => string

export const throwInvalidOperandError = (
	...args: Parameters<typeof writeInvalidOperandMessage>
) => throwParseError(writeInvalidOperandMessage(...args))

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export const writeInvalidOperandMessage = (
	kind: ConstraintKind,
	expected: Stringifiable,
	basis: Node<BasisKind> | undefined
) => `${kind} operand must be ${expected} (was ${getBasisName(basis)})`

export type writeInvalidOperandMessage<
	kind extends ConstraintKind,
	expected extends Stringifiable,
	basis extends Stringifiable
> = `${kind} operand must be ${expected} (was ${basis})`
