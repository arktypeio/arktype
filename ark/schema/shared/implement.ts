import {
	map,
	throwInternalError,
	type ErrorMessage,
	type JsonData,
	type entryOf,
	type listable,
	type parseNonNegativeInteger,
	type requireKeys
} from "@arktype/util"
import type { Node, UnknownNode } from "../base.js"
import type { Declaration, ExpectedContext, Inner } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type {
	NodeConfig,
	ParsedUnknownNodeConfig,
	ScopeNode
} from "../scope.js"
import { compileSerializedValue } from "../traversal/registry.js"
import type {
	BaseMeta,
	BaseNodeDeclaration,
	baseAttachmentsOf
} from "./declare.js"

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

export const propRefinementKinds = [
	"keys",
	"required",
	"optional",
	"index",
	"sequence"
] as const

export type PropRefinementKind = (typeof propRefinementKinds)[number]

export const shallowRefinementKinds = [
	"pattern",
	"divisor",
	...boundKinds
] as const

export type ShallowRefinementKind = (typeof shallowRefinementKinds)[number]

export const refinementKinds = [
	...propRefinementKinds,
	...shallowRefinementKinds,
	"predicate"
] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const setKinds = ["union", "morph", "intersection"] as const

export type SetKind = (typeof setKinds)[number]

export const typeKinds = [...setKinds, ...basisKinds] as const

export type TypeKind = (typeof typeKinds)[number]

export const constraintKinds = [...basisKinds, ...refinementKinds] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export type NodeKind = SetKind | ConstraintKind

export const nodeKinds = [
	"union",
	"morph",
	"unit",
	"intersection",
	"proto",
	"domain",
	...refinementKinds
] as const satisfies NodeKind[]

export type OpenRefinementKind = {
	[k in RefinementKind]: Declaration<k>["open"] extends true ? k : never
}[RefinementKind]

export type ClosedRefinementKind = Exclude<RefinementKind, OpenRefinementKind>

export const primitiveKinds = [
	...basisKinds,
	...shallowRefinementKinds,
	"predicate",
	"keys"
] as const

export type PrimitiveKind = (typeof primitiveKinds)[number]

export type CompositeKind = Exclude<NodeKind, PrimitiveKind>

export type OrderedNodeKinds = typeof nodeKinds

type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

export type kindRightOf<kind extends NodeKind> = RightsByKind[kind]

type accumulateRightKinds<
	remaining extends readonly NodeKind[],
	result
> = remaining extends readonly [
	infer head extends NodeKind,
	...infer tail extends NodeKind[]
]
	? accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	: result

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
	reduce?: (inner: d["inner"], $: ScopeNode) => Node | undefined
	attachments?: AttachImplementation<d>
}

export type AttachImplementation<d extends BaseNodeDeclaration> = (
	base: baseAttachmentsOf<d>
) => d["attachments"]

export interface PrimitiveAttachmentsInput {
	primitive: true
	compiledCondition: string
	compiledNegation: string
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<BaseNodeDeclaration> {
	defaults: ParsedUnknownNodeConfig
	keys: Record<string, NodeKeyImplementation<any, any>>
}

export type nodeImplementationOf<d extends BaseNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		defaults: nodeDefaultsImplementationFor<d["kind"]>
	}

export type nodeImplementationInputOf<d extends BaseNodeDeclaration> =
	requireKeys<
		CommonNodeImplementationInput<d> & {
			defaults: nodeDefaultsImplementationInputFor<d["kind"]>
		},
		{} extends d["attachments"] ? never : "attachments"
	>

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
