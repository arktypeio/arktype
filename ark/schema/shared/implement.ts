import {
	type Entry,
	type ErrorMessage,
	type Json,
	type JsonData,
	compileSerializedValue,
	type entryOf,
	flatMorph,
	type indexOf,
	type keySetOf,
	type listable,
	printable,
	type requireKeys,
	type show
} from "@arktype/util"
import type { PropsGroupInput } from "../constraints/props/props.js"
import type { Declaration, Inner, errorContext } from "../kinds.js"
import type { Node, RawNode } from "../node.js"
import type { NodeParseContext } from "../parse.js"
import type {
	RawSchema,
	schemaKindOrRightOf,
	schemaKindRightOf
} from "../schema.js"
import type { IntersectionInner } from "../schemas/intersection.js"
import type {
	NodeConfig,
	ParsedUnknownNodeConfig,
	RawSchemaScope
} from "../scope.js"
import type {
	BaseErrorContext,
	BaseMeta,
	RawNodeDeclaration
} from "./declare.js"
import type { Disjoint } from "./disjoint.js"
import { throwArkError } from "./errors.js"
import { isNode } from "./utils.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const propKinds = ["prop", "index", "sequence"] as const

export type PropKind = (typeof propKinds)[number]

export const rangeKinds = [
	"max",
	"min",
	"maxLength",
	"minLength",
	"before",
	"after"
] as const

export type RangeKind = (typeof rangeKinds)[number]

export const boundKinds = ["exactLength", ...rangeKinds] as const

export type BoundKind = (typeof boundKinds)[number]

export const refinementKinds = ["regex", "divisor", ...boundKinds] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const constraintKinds = [
	...refinementKinds,
	...propKinds,
	"predicate"
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const schemaKinds = [
	"union",
	"morph",
	"unit",
	"intersection",
	"proto",
	"domain"
] as const

export type SchemaKind = (typeof schemaKinds)[number]

export const intersectionChildKinds = [
	"proto",
	"domain",
	...constraintKinds
] as const

export type IntersectionChildKind = (typeof intersectionChildKinds)[number]

export type NodeKind = SchemaKind | ConstraintKind

export const nodeKinds = [
	...schemaKinds,
	...refinementKinds,
	...propKinds,
	"predicate"
] as const satisfies NodeKind[]

export type OpenNodeKind = {
	[k in NodeKind]: Declaration<k>["intersectionIsOpen"] extends true ? k : never
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

export const constraintKeys = flatMorph(
	constraintKinds,
	(i, kind) => [kind, 1] as const
)

export const propKeys = flatMorph(
	[...propKinds, "onExtraneousKey"] satisfies (keyof PropsGroupInput)[],
	(i, k) => [k, 1] as const
)

export const discriminatingIntersectionKeys = {
	...constraintKeys,
	onExtraneousKey: 1
} as const satisfies keySetOf<IntersectionInner>

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
	$: RawSchemaScope
	invert: boolean
}

export type ConstraintIntersection<
	lKind extends ConstraintKind,
	rKind extends kindOrRightOf<lKind>
> = (
	l: Node<lKind>,
	r: Node<rKind>,
	ctx: IntersectionContext
) => RawNode | Disjoint | null

export type ConstraintIntersectionMap<kind extends ConstraintKind> = show<
	{
		[_ in kind]: ConstraintIntersection<kind, kind>
	} & {
		[rKind in kindRightOf<kind>]?: ConstraintIntersection<kind, rKind>
	}
>

export type TypeIntersection<
	lKind extends SchemaKind,
	rKind extends schemaKindOrRightOf<lKind>
> = (
	l: Node<lKind>,
	r: Node<rKind>,
	ctx: IntersectionContext
) => RawSchema | Disjoint

export type TypeIntersectionMap<kind extends SchemaKind> = {
	[rKind in schemaKindOrRightOf<kind>]: TypeIntersection<kind, rKind>
}

export type IntersectionMap<kind extends NodeKind> =
	kind extends SchemaKind ? TypeIntersectionMap<kind>
	:	ConstraintIntersectionMap<kind & ConstraintKind>

export type UnknownIntersectionMap = {
	[k in NodeKind]?: (
		l: RawNode,
		r: RawNode,
		ctx: IntersectionContext
	) => UnknownIntersectionResult
}

export type UnknownIntersectionResult = RawNode | Disjoint | null

type PrecedenceByKind = {
	[i in indexOf<OrderedNodeKinds> as OrderedNodeKinds[i]]: i
}

export const precedenceByKind = flatMorph(
	nodeKinds,
	(i, kind) => [kind, i] as entryOf<PrecedenceByKind>
)

export const isNodeKind = (value: unknown): value is NodeKind =>
	typeof value === "string" && value in precedenceByKind

export function assertNodeKind<kind extends NodeKind>(
	value: RawNode,
	kind: kind
): asserts value is Node<kind> {
	const valueIsNode = isNode(value)
	if (!valueIsNode || value.kind !== kind) {
		throwArkError(
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

export const schemaKindsRightOf = <kind extends SchemaKind>(
	kind: kind
): schemaKindRightOf<kind>[] =>
	schemaKinds.slice(precedenceOfKind(kind) + 1) as never

export type KeyDefinitions<d extends RawNodeDeclaration> = {
	[k in keyRequiringDefinition<d>]: NodeKeyImplementation<d, k>
}

type keyRequiringDefinition<d extends RawNodeDeclaration> = Exclude<
	keyof d["normalizedDef"],
	keyof BaseMeta
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
	d extends RawNodeDeclaration,
	k extends keyof d["normalizedDef"],
	instantiated = k extends keyof d["inner"] ? d["inner"][k] : never
> = requireKeys<
	{
		preserveUndefined?: true
		meta?: true
		child?: true
		implied?: true
		serialize?: (
			schema: instantiated extends listable<RawNode> | undefined ?
				ErrorMessage<`Keys with node children cannot specify a custom serializer`>
			:	instantiated
		) => JsonData
		parse?: (
			schema: Exclude<d["normalizedDef"][k], undefined>,
			ctx: NodeParseContext
		) => instantiated
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	| (d["normalizedDef"][k] extends instantiated ? never : "parse")
	// require keys containing children specify it
	| ([instantiated] extends [listable<RawNode> | undefined] ? "child" : never)
>

interface CommonNodeImplementationInput<d extends RawNodeDeclaration> {
	kind: d["kind"]
	keys: KeyDefinitions<d>
	normalize: (schema: d["def"]) => d["normalizedDef"]
	hasAssociatedError: d["errorContext"] extends null ? false : true
	collapsibleKey?: keyof d["inner"]
	reduce?: (
		inner: d["inner"],
		$: RawSchemaScope
	) => Node<d["reducibleTo"]> | Disjoint | undefined
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<RawNodeDeclaration> {
	defaults: ParsedUnknownNodeConfig
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

export type nodeImplementationOf<d extends RawNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		intersections: IntersectionMap<d["kind"]>
		intersectionIsOpen: d["intersectionIsOpen"]
		defaults: Required<NodeConfig<d["kind"]>>
	}

export type nodeImplementationInputOf<d extends RawNodeDeclaration> =
	CommonNodeImplementationInput<d> & {
		intersections: IntersectionMap<d["kind"]>
		defaults: nodeDefaultsImplementationInputFor<d["kind"]>
	} & (d["intersectionIsOpen"] extends true ? { intersectionIsOpen: true }
		:	{}) &
		// if the node is declared as reducible to a kind other than its own,
		// there must be a reduce implementation
		(d["reducibleTo"] extends d["kind"] ? {} : { reduce: {} })

type nodeDefaultsImplementationInputFor<kind extends NodeKind> = requireKeys<
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
	node: Node<kind>
) => string

export interface UnknownAttachments {
	alias?: string
	readonly kind: NodeKind
	readonly impl: UnknownNodeImplementation
	readonly baseName: string
	readonly inner: Record<string, any>
	readonly entries: readonly Entry<string>[]
	readonly json: object
	readonly typeJson: object
	readonly collapsibleJson: JsonData
	readonly children: RawNode[]
	readonly innerId: string
	readonly typeId: string
	readonly $: RawSchemaScope
}

export interface NarrowedAttachments<d extends RawNodeDeclaration>
	extends UnknownAttachments {
	kind: d["kind"]
	inner: d["inner"]
	json: Json
	typeJson: Json
	collapsibleJson: JsonData
	children: Node<d["childKind"]>[]
}

export const implementNode = <d extends RawNodeDeclaration = never>(
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
	return implementation as never
}
