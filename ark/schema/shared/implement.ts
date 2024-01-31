import {
	map,
	throwParseError,
	type ErrorMessage,
	type JsonData,
	type PartialRecord,
	type entryOf,
	type listable,
	type parseNonNegativeInteger,
	type requireKeys
} from "@arktype/util"
import type { Node, TypeNode, UnknownNode } from "../base.js"
import type {
	Declaration,
	ExpectedContext,
	Inner,
	hasOpenIntersection
} from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type {
	NodeConfig,
	ParsedUnknownNodeConfig,
	ScopeNode
} from "../scope.js"
import type { ConditionalConstraintKind } from "../sets/intersection.js"
import { compileSerializedValue } from "../traversal/registry.js"
import type { BaseMeta, BaseNodeDeclaration } from "./declare.js"
import type { Disjoint } from "./disjoint.js"
import type { NodeIntersections } from "./intersect.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const boundKinds = [
	"min",
	"max",
	"minLength",
	"maxLength",
	"after",
	"before"
] as const

export type BoundKind = (typeof boundKinds)[number]

export const propKinds = ["required", "optional", "index", "sequence"] as const

export type PropKind = (typeof propKinds)[number]

export const shallowKinds = ["pattern", "divisor", ...boundKinds] as const

export type ShallowKind = (typeof shallowKinds)[number]

export const refinementKinds = [...shallowKinds, "predicate"] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const setKinds = ["union", "morph", "intersection"] as const

export type SetKind = (typeof setKinds)[number]

export const typeKinds = [...setKinds, ...basisKinds] as const

export type TypeKind = (typeof typeKinds)[number]

export const constraintKinds = [
	...basisKinds,
	...refinementKinds,
	...propKinds
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const nodeKinds = [...setKinds, ...constraintKinds] as const

export type NodeKind = (typeof nodeKinds)[number]

export type OpenIntersectionKind = {
	[k in NodeKind]: hasOpenIntersection<Declaration<k>> extends true ? k : never
}[NodeKind]

export type ClosedIntersectionKind = Exclude<NodeKind, OpenIntersectionKind>

export const primitiveKinds = [...basisKinds, ...refinementKinds] as const

export type PrimitiveKind = (typeof primitiveKinds)[number]

export type OrderedNodeKinds = typeof nodeKinds

type indexOf<array extends readonly unknown[]> = keyof array extends infer k
	? parseNonNegativeInteger<k & string>
	: never

type PrecedenceByKind = {
	[i in indexOf<OrderedNodeKinds> as OrderedNodeKinds[i]]: i
}

const precedenceByKind = map(
	nodeKinds,
	(i, kind) => [kind, i] as entryOf<PrecedenceByKind>
)

export type precedenceOfKind<kind extends NodeKind> = PrecedenceByKind[kind]

export const precedenceOfKind = <kind extends NodeKind>(kind: kind) =>
	precedenceByKind[kind]

export type KeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in undefinedKey<d>]: NodeKeyImplementation<d, k>
}

type undefinedKey<d extends BaseNodeDeclaration> = Exclude<
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
	hasAssociatedError: boolean
	collapseKey?: keyof d["inner"] & string
	addParseContext?: (ctx: SchemaParseContext) => void
	reduce?: (inner: d["inner"], scope: ScopeNode) => Node | undefined
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<BaseNodeDeclaration> {
	intersect: Record<string, (l: any, r: any) => Inner<any> | Disjoint | null>
	defaults: ParsedUnknownNodeConfig
}

export type nodeImplementationOf<d extends BaseNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		defaults: nodeDefaultsImplementationFor<d["kind"]>
	}

export interface nodeImplementationInputOf<d extends BaseNodeDeclaration>
	extends CommonNodeImplementationInput<d> {
	intersect: NodeIntersections<d>
	defaults: nodeDefaultsImplementationInputFor<d["kind"]>
}

type nodeDefaultsImplementationInputFor<kind extends NodeKind> = requireKeys<
	NodeConfig<kind>,
	| "description"
	// if the node's error context is distinct from its inner definition, ensure it is implemented.
	// this occurs for nodes like `union` where the error that occurs is not 1:1 with the existing node,
	// but rather a single failed condition for each branch.
	| (ExpectedContext<kind> extends Inner<kind>
			? never
			: "expected" & keyof NodeConfig<kind>)
>

export type nodeDefaultsImplementationFor<kind extends NodeKind> = Required<
	NodeConfig<kind>
>

export type DescriptionWriter<kind extends NodeKind = NodeKind> = (
	inner: NodeKind extends kind ? any : Omit<Inner<kind>, "description">
) => string

export type ConstraintGroupName = keyof ConstraintKindsByGroup

export type GroupedConstraints = {
	[k in ConstraintGroupName]?: Node<ConstraintKindsByGroup[k]>[]
}

export type ConstraintKindsByGroup = {
	basis: BasisKind
	shallow: ShallowKind
	props: PropKind
	predicate: "predicate"
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

const prerequisiteCache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export const createBasisAssertion = (node: Node<ConditionalConstraintKind>) => {
	const prerequisites: readonly TypeNode[] =
		prerequisiteCache[node.kind] ??
		(prerequisiteCache[node.kind] = node.prerequisiteSchemas.map((schema) =>
			node.$.parseTypeNode(schema)
		))
	return (basis: Node<BasisKind> | undefined) => {
		if (prerequisites.length === 1 && prerequisites[0].isUnknown()) {
			return
		}
		if (!prerequisites.some((prerequisite) => basis?.extends(prerequisite))) {
			throwParseError(
				`${node.kind} operand must be of type ${prerequisites.join(
					" or "
				)} (was ${getBasisName(basis)})`
			)
		}
	}
}
