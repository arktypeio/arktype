import {
	flatMorph,
	hasDomain,
	printable,
	serializePrimitive,
	throwParseError,
	type Entry,
	type Json,
	type JsonObject,
	type JsonStructure,
	type KeySet,
	type arrayIndexOf,
	type entryOf,
	type keySetOf,
	type listable,
	type requireKeys,
	type show
} from "@ark/util"
import type { NodeConfig, ResolvedUnknownNodeConfig } from "../config.ts"
import type { Declaration, nodeOfKind } from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import type { NodeId } from "../parse.ts"
import type {
	BaseRoot,
	schemaKindOrRightOf,
	schemaKindRightOf
} from "../roots/root.ts"
import type { BaseScope, ResolvedScopeConfig } from "../scope.ts"
import type { Structure } from "../structure/structure.ts"
import { compileSerializedValue } from "./compile.ts"
import type { BaseNodeDeclaration } from "./declare.ts"
import type { Disjoint } from "./disjoint.ts"
import { errorWriters, errorWritersByCode } from "./errorWriters.ts"
import { namedReference } from "./registry.ts"
import { isNode, type makeRootAndArrayPropertiesMutable } from "./utils.ts"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const structuralKinds = [
	"required",
	"optional",
	"index",
	"sequence"
] as const

export type StructuralKind = (typeof structuralKinds)[number]

export const prestructuralKinds = [
	"pattern",
	"divisor",
	"exactLength",
	"max",
	"min",
	"maxLength",
	"minLength",
	"before",
	"after",
	"notEqual",
	"notEqualLength"
] as const

export type PrestructuralKind = (typeof prestructuralKinds)[number]

export const refinementKinds = [
	...prestructuralKinds,
	"structure",
	"predicate"
] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const constraintKinds = [...refinementKinds, ...structuralKinds] as const

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
	[k in NodeKind]: Declaration<k>["stacks"] extends true ? k : never
}[NodeKind]

export type ClosedNodeKind = Exclude<NodeKind, OpenNodeKind>

export type PrimitiveKind = Exclude<RefinementKind | BasisKind, "structure">

export type CompositeKind = Exclude<NodeKind, PrimitiveKind>

export type OrderedNodeKinds = typeof nodeKinds

export const constraintKeys: KeySet<ConstraintKind> = flatMorph(
	constraintKinds,
	(i, kind) => [kind, 1] as const
)

export const structureKeys: keySetOf<Structure.Inner> = flatMorph(
	[...structuralKinds, "undeclared", "order"],
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

export const unionChildKinds = /* @__PURE__ */ (() =>
	[...schemaKindsRightOf("union"), "alias"] as const)()

export type UnionChildKind = (typeof unionChildKinds)[number]

export const morphChildKinds = /* @__PURE__ */ (() =>
	[...schemaKindsRightOf("morph"), "alias"] as const)()

export type MorphChildKind = (typeof morphChildKinds)[number]

export type keyImplementationsOf<d extends BaseNodeDeclaration> = {
	[k in keyof d["inner"]]-?: NodeKeyImplementation<d, k>
}

// a string that reads like another value's serialization is quoted
const ambiguousStringPattern =
	/^(?:"|\$ark\d*\.|(?:NaN|-?Infinity|-0|-?\d+n|undefined|[+-]?\d{4,6}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)$)/

export const defaultValueSerializer = (v: unknown): Json => {
	if (typeof v === "string")
		return ambiguousStringPattern.test(v) ? JSON.stringify(v) : v
	if (typeof v === "boolean" || v === null) return v

	if (typeof v === "number") {
		if (Number.isNaN(v)) return "NaN"
		if (v === Number.POSITIVE_INFINITY) return "Infinity"
		if (v === Number.NEGATIVE_INFINITY) return "-Infinity"
		if (Object.is(v, -0)) return "-0"
		return v
	}

	// registering would keep the value alive, so only values compiled code reads are registered
	return hasDomain(v, "object") || typeof v === "symbol" ?
			namedReference(v)
		:	serializePrimitive(v as never)
}

export const metaJsonOf = (meta: ArkEnv.meta): JsonObject =>
	flatMorph(meta, (k, v) => [
		k,
		k === "examples" ?
			(v as unknown[]).map(defaultValueSerializer)
		:	defaultValueSerializer(v)
	])

export type NodeKeyImplementation<
	d extends BaseNodeDeclaration,
	k extends keyof d["inner"],
	instantiated = Exclude<d["inner"][k], undefined>
> = requireKeys<
	{
		/** whether an undefined value is kept as the key's value rather than dropped */
		keepUndef?: true
		child?: boolean | ((value: instantiated) => BaseNode[])
		serialize?: (schema: instantiated) => Json
		// a structural value defers an alias it holds elsewhere to an alias of its own
		structural?: true
		// written to no json, so nodes it alone tells apart are equal
		unserialized?: true
		reduceIo?: (
			ioKind: "in" | "out",
			inner: makeRootAndArrayPropertiesMutable<d["inner"]>,
			value: d["inner"][k]
		) => void
	},
	// require keys containing children specify it, although it can be false in cases like
	// declaredOut where we don't want to treat the node as a child
	[instantiated] extends [listable<BaseNode>] ? "child" : never
>

interface CommonNodeImplementationInput<d extends BaseNodeDeclaration> {
	kind: d["kind"]
	keys: keyImplementationsOf<d>
	applyConfig?: (inner: d["inner"], config: ResolvedScopeConfig) => d["inner"]
	/** whether it reports its own error when data fails it, rather than its children's */
	ownErr: d["errorCtx"] extends null ? false : true
	/** rewrites its inner JSON once it's written, e.g. to collapse a key */
	fixJson?: (json: {
		[k in keyof d["inner"]]: Json
	}) => JsonStructure
	/** the key whose value stands for its whole json when it's all the json holds */
	bareKey?: keyof d["inner"]
	/** whether its description says what its basis would, so the basis isn't described */
	coversNoun?: d["kind"] extends RefinementKind ? true : never
	/** whether its expression says what its basis would, so the basis isn't written */
	coversExpr?: d["kind"] extends RefinementKind ? true : never
}

export interface UnknownNodeImplementation
	extends CommonNodeImplementationInput<BaseNodeDeclaration> {
	defaults: ResolvedUnknownNodeConfig
	/** whether one intersection can hold several of its kind, as narrows and `!=` can */
	stacks: boolean
	keys: Record<string, NodeKeyImplementation<any, any>>
}

export const compileObjectLiteral = (ctx: object): string => {
	let result = "{ "
	for (const [k, v] of Object.entries(ctx))
		result += `${k}: ${compileSerializedValue(v)}, `
	return result + " }"
}

export type nodeImplementationOf<d extends BaseNodeDeclaration> =
	nodeImplementationInputOf<d> & {
		stacks: d["stacks"]
		defaults: Required<NodeConfig<d["kind"]>>
	}

export type nodeImplementationInputOf<d extends BaseNodeDeclaration> =
	CommonNodeImplementationInput<d> & {
		defaults: { description: DescriptionWriter<d["kind"]> }
	} & (d["stacks"] extends true ? { stacks: true } : {})

export type DescriptionWriter<kind extends NodeKind = NodeKind> = (
	node: nodeOfKind<kind>
) => string

export interface UnknownAttachments {
	readonly kind: NodeKind
	readonly impl: UnknownNodeImplementation
	readonly id: NodeId

	readonly inner: Record<string, any>
	readonly kv: readonly Entry<string>[]

	readonly meta: ArkEnv.meta
	readonly metaJson: object

	readonly children: BaseNode[]
}

// what createNode passes; the rest is computed when read
export interface UnknownAttachmentsInput
	extends Omit<UnknownAttachments, "kv" | "metaJson"> {
	readonly metaJson: object | undefined
}

export interface NarrowedAttachments<d extends BaseNodeDeclaration>
	extends UnknownAttachments {
	kind: d["kind"]
	inner: d["inner"]
	children: nodeOfKind<d["childKind"]>[]
}

export const implementNode = <d extends BaseNodeDeclaration = never>(
	_: nodeImplementationInputOf<d>
): nodeImplementationOf<d> => {
	const implementation: UnknownNodeImplementation = _ as never
	if (implementation.ownErr) {
		Object.assign(
			implementation.defaults,
			errorWriters,
			errorWritersByCode[implementation.kind as never]
		)
		implementation.defaults.expected ??= ctx =>
			"description" in ctx ?
				(ctx.description as string)
			:	implementation.defaults.description(ctx as never)
	}
	return implementation as never
}
