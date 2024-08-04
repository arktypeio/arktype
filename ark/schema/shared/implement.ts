import {
	flatMorph,
	printable,
	throwParseError,
	type Entry,
	type Json,
	type JsonData,
	type PartialRecord,
	type arrayIndexOf,
	type entryOf,
	type keySet,
	type keySetOf,
	type listable,
	type propValueOf,
	type requireKeys,
	type show
} from "@ark/util"
import type { NodeConfig, ResolvedUnknownNodeConfig } from "../config.js"
import type { Declaration, Inner, errorContext, nodeOfKind } from "../kinds.js"
import type { BaseNode } from "../node.js"
import type { NodeParseContext } from "../parse.js"
import type {
	BaseRoot,
	schemaKindOrRightOf,
	schemaKindRightOf
} from "../roots/root.js"
import type { BaseScope } from "../scope.js"
import type { Structure } from "../structure/structure.js"
import { compileSerializedValue } from "./compile.js"
import type {
	BaseErrorContext,
	BaseMeta,
	BaseNodeDeclaration,
	BaseNormalizedSchema
} from "./declare.js"
import type { Disjoint } from "./disjoint.js"
import { isNode } from "./utils.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const structuralKinds = [
	"required",
	"optional",
	"index",
	"sequence"
] as const

export type StructuralKind = (typeof structuralKinds)[number]

export type RangeKind = Exclude<BoundKind, "exactLength">

export type BoundKind = Exclude<RefinementKind, "pattern" | "divisor">

export const refinementKinds = [
	"pattern",
	"divisor",
	"exactLength",
	"max",
	"min",
	"maxLength",
	"minLength",
	"before",
	"after"
] as const

export type RefinementKind = (typeof refinementKinds)[number]

type orderedConstraintKinds = [
	...typeof refinementKinds,
	...typeof structuralKinds,
	"structure",
	"predicate"
]

export const constraintKinds: orderedConstraintKinds = [
	...refinementKinds,
	...structuralKinds,
	"structure",
	"predicate"
]

export type ConstraintKind = (typeof constraintKinds)[number]

export const rootKinds = [
	"alias",
	"union",
	"morph",
	"unit",
	"intersection",
	"proto",
	"domain"
] as const

export type RootKind = (typeof rootKinds)[number]

export type NodeKind = RootKind | ConstraintKind

type orderedNodeKinds = [...typeof rootKinds, ...typeof constraintKinds]

export const nodeKinds: orderedNodeKinds = [...rootKinds, ...constraintKinds]

export type OpenNodeKind = {
	[k in NodeKind]: Declaration<k>["intersectionIsOpen"] extends true ? k : never
}[NodeKind]

export type ClosedNodeKind = Exclude<NodeKind, OpenNodeKind>

export type PrimitiveKind = RefinementKind | BasisKind | "predicate"

export type CompositeKind = Exclude<NodeKind, PrimitiveKind>

export type OrderedNodeKinds = typeof nodeKinds

export const constraintKeys: keySet<ConstraintKind> = flatMorph(
	constraintKinds,
	(i, kind) => [kind, 1] as const
)

export const structureKeys: keySetOf<Structure.Inner> = flatMorph(
	[...structuralKinds, "undeclared"],
	(i, k) => [k, 1] as const
)

type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

export type kindOrRightOf<kind extends NodeKind> = kind | kindRightOf<kind>

export type kindLeftOf<kind extends NodeKind> = Exclude<
	NodeKind,
	kindOrRightOf<kind>
>

export type kindOrLeftOf<kind extends NodeKind> = kind | kindLeftOf<kind>

type accumulateRightKinds<remaining extends readonly NodeKind[], result> =
	remaining extends (
		readonly [infer head extends NodeKind, ...infer tail extends NodeKind[]]
	) ?
		accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	:	result

export interface InternalIntersectionOptions {
	pipe: boolean
}

export interface IntersectionContext extends InternalIntersectionOptions {
	$: BaseScope
	invert: boolean
}

export type ConstraintIntersection<
	lKind extends ConstraintKind,
	rKind extends kindOrRightOf<lKind>
> = (
	l: nodeOfKind<lKind>,
	r: nodeOfKind<rKind>,
	ctx: IntersectionContext
) => BaseNode | Disjoint | null

export type ConstraintIntersectionMap<kind extends ConstraintKind> = show<
	{
		[_ in kind]: ConstraintIntersection<kind, kind>
	} & {
		[rKind in kindRightOf<kind>]?: ConstraintIntersection<kind, rKind>
	}
>

export type RootIntersection<
	lKind extends RootKind,
	rKind extends schemaKindOrRightOf<lKind>
> = (
	l: nodeOfKind<lKind>,
	r: nodeOfKind<rKind>,
	ctx: IntersectionContext
) => BaseRoot | Disjoint

export type TypeIntersectionMap<kind extends RootKind> = {
	[rKind in schemaKindOrRightOf<kind>]: RootIntersection<kind, rKind>
}

export type IntersectionMap<kind extends NodeKind> =
	kind extends RootKind ? TypeIntersectionMap<kind>
	:	ConstraintIntersectionMap<kind & ConstraintKind>

export type UnknownIntersectionMap = {
	[k in NodeKind]?: (
		l: BaseNode,
		r: BaseNode,
		ctx: IntersectionContext
	) => UnknownIntersectionResult
}

export type UnknownIntersectionResult = BaseNode | Disjoint | null

type PrecedenceByKind = {
	[i in arrayIndexOf<OrderedNodeKinds> as OrderedNodeKinds[i]]: i
}

export const precedenceByKind: PrecedenceByKind = flatMorph(
	nodeKinds,
	(i, kind) => [kind, i] as entryOf<PrecedenceByKind>
)

export const isNodeKind = (value: unknown): value is NodeKind =>
	typeof value === "string" && value in precedenceByKind

export function assertNodeKind<kind extends NodeKind>(
	value: BaseNode,
	kind: kind
): asserts value is nodeOfKind<kind> {
	const valueIsNode = isNode(value)
	if (!valueIsNode || value.kind !== kind) {
		throwParseError(
			`Expected node of kind ${kind} (was ${
				valueIsNode ? `${value.kind} node` : printable(value)
			})`
		)
	}
}

export type precedenceOfKind<kind extends NodeKind> = PrecedenceByKind[kind]

export const precedenceOfKind = <kind extends NodeKind>(
	kind: kind
): precedenceOfKind<kind> => precedenceByKind[kind]

export type kindRightOf<kind extends NodeKind> = RightsByKind[kind]

export const schemaKindsRightOf = <kind extends RootKind>(
	kind: kind
): schemaKindRightOf<kind>[] =>
	rootKinds.slice(precedenceOfKind(kind) + 1) as never

export type keySchemaDefinitions<d extends BaseNodeDeclaration> = {
	[k in keyRequiringSchemaDefinition<d>]: NodeKeyImplementation<d, k>
}

type keyRequiringSchemaDefinition<d extends BaseNodeDeclaration> = Exclude<
	keyof d["normalizedSchema"],
	keyof BaseNormalizedSchema
>

export const defaultValueSerializer = (v: unknown): JsonData => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	)
		return v

	return compileSerializedValue(v)
}

export type NodeKeyImplementation<
	d extends BaseNodeDeclaration,
	k extends keyof d["normalizedSchema"],
	instantiated = k extends keyof d["inner"] ? Exclude<d["inner"][k], undefined>
	:	never
> = requireKeys<
	{
		preserveUndefined?: true
		child?: true
		serialize?: (schema: instantiated) => JsonData
		parse?: (
			schema: Exclude<d["normalizedSchema"][k], undefined>,
			ctx: NodeParseContext<d["kind"]>
		) => instantiated | undefined
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	| (d["normalizedSchema"][k] extends instantiated | undefined ? never
	  :	"parse")
	// require keys containing children specify it
	| ([instantiated] extends [listable<BaseNode>] ? "child" : never)
>

interface CommonNodeImplementationInput<d extends BaseNodeDeclaration> {
	kind: d["kind"]
	keys: keySchemaDefinitions<d>
	normalize: (schema: d["schema"]) => d["normalizedSchema"]
	hasAssociatedError: d["errorContext"] extends null ? false : true
	finalizeJson?: (json: { [k in keyof d["inner"]]: JsonData }) => Json
	collapsibleKey?: keyof d["inner"]
	reduce?: (
		inner: d["inner"],
		$: BaseScope
	) => nodeOfKind<d["reducibleTo"]> | Disjoint | undefined
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<BaseNodeDeclaration> {
	defaults: ResolvedUnknownNodeConfig
	intersectionIsOpen: boolean
	intersections: UnknownIntersectionMap
	keys: Record<string, NodeKeyImplementation<any, any>>
}

export const compileErrorContext = (ctx: object): string => {
	let result = "{ "
	for (const [k, v] of Object.entries(ctx))
		result += `${k}: ${compileSerializedValue(v)}, `

	return result + " }"
}

export type nodeImplementationOf<d extends BaseNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		intersections: IntersectionMap<d["kind"]>
		intersectionIsOpen: d["intersectionIsOpen"]
		defaults: Required<NodeConfig<d["kind"]>>
	}

export type nodeImplementationInputOf<d extends BaseNodeDeclaration> =
	CommonNodeImplementationInput<d> & {
		intersections: IntersectionMap<d["kind"]>
		defaults: nodeSchemaaultsImplementationInputFor<d["kind"]>
	} & (d["intersectionIsOpen"] extends true ? { intersectionIsOpen: true }
		:	{}) &
		// if the node is declared as reducible to a kind other than its own,
		// there must be a reduce implementation
		(d["reducibleTo"] extends d["kind"] ? {} : { reduce: {} })

type nodeSchemaaultsImplementationInputFor<kind extends NodeKind> = requireKeys<
	NodeConfig<kind>,
	| "description"
	// if the node's error context is distinct from its inner definition, ensure it is implemented.
	// this occurs for nodes like `union` where the error that occurs is not 1:1 with the existing node,
	// but rather a single failed condition for each branch.
	| (Inner<kind> extends (
			Omit<errorContext<kind>, keyof BaseErrorContext | "description">
	  ) ?
			never
	  :	"expected" & keyof NodeConfig<kind>)
>

export type DescriptionWriter<kind extends NodeKind = NodeKind> = (
	node: nodeOfKind<kind>
) => string

export interface UnknownAttachments {
	alias?: string
	readonly kind: NodeKind
	readonly impl: UnknownNodeImplementation
	readonly id: string
	readonly inner: Record<string, any>
	readonly entries: readonly Entry<string>[]
	readonly json: object
	readonly typeJson: object
	readonly collapsibleJson: JsonData
	readonly children: BaseNode[]
	readonly innerHash: string
	readonly typeHash: string
	readonly meta: BaseMeta
}

export interface NarrowedAttachments<d extends BaseNodeDeclaration>
	extends UnknownAttachments {
	kind: d["kind"]
	inner: d["inner"]
	json: Json
	typeJson: Json
	collapsibleJson: JsonData
	children: nodeOfKind<d["childKind"]>[]
}

export const baseKeys: PartialRecord<
	string,
	propValueOf<keySchemaDefinitions<any>>
> = {
	description: { meta: true }
} satisfies keySchemaDefinitions<BaseNodeDeclaration> as never

export const implementNode = <d extends BaseNodeDeclaration = never>(
	_: nodeImplementationInputOf<d>
): nodeImplementationOf<d> => {
	const implementation: UnknownNodeImplementation = _ as never
	if (implementation.hasAssociatedError) {
		implementation.defaults.expected ??= ctx =>
			"description" in ctx ?
				(ctx.description as string)
			:	implementation.defaults.description(ctx as never)
		implementation.defaults.actual ??= data => printable(data)
		implementation.defaults.problem ??= ctx =>
			`must be ${ctx.expected}${ctx.actual ? ` (was ${ctx.actual})` : ""}`
		implementation.defaults.message ??= ctx => {
			if (ctx.path.length === 0) return ctx.problem
			const problemWithLocation = `${ctx.propString} ${ctx.problem}`
			if (problemWithLocation[0] === "[") {
				// clarify paths like [1], [0][1], and ["key!"] that could be confusing
				return `value at ${problemWithLocation}`
			}
			return problemWithLocation
		}
	}
	Object.assign(implementation.keys, baseKeys)
	return implementation as never
}
