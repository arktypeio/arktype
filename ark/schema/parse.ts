import {
	includes,
	isArray,
	isDate,
	isEmptyObject,
	nameOf,
	printable,
	throwInternalError,
	throwParseError,
	type arkKind,
	type Brand,
	type dict,
	type JsonObject,
	type listable,
	type PartialRecord
} from "@ark/util"
import {
	nodeClassesByKind,
	nodeImplementationsByKind,
	type NodeInput
} from "./kinds.ts"
import type { BaseNode } from "./node.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import { Disjoint } from "./shared/disjoint.ts"
import {
	metaJsonOf,
	isNodeKind,
	precedenceOfKind,
	prestructuralKinds,
	type NodeKind,
	type UnknownAttachmentsInput
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import { composing, hasArkKind, isNode } from "./shared/utils.ts"

export type ContextualArgs = Record<string, BaseRoot | NodeId>

export type BaseParseOptions<prereduced extends boolean = boolean> = {
	alias?: string
	prereduced?: prereduced
	args?: ContextualArgs
	id?: NodeId
	// the content name an anonymous cycle's references print where `this` would mean another Type
	name?: string
}

export interface BaseParseContextInput extends BaseParseOptions {
	prefix: string
	def: unknown
}

export interface AttachedParseContext {
	[arkKind]: "context"
	$: BaseScope
	id: NodeId
	phase: "unresolved" | "resolving" | "member" | "resolved" | "failed"
	isReferencedById?: true
	isReferencedAsThis?: true
	index?: number
	lowlink?: number
	closesCycle?: true
	resolution?: BaseRoot
	error?: unknown
}

export interface BaseParseContext
	extends BaseParseContextInput,
		AttachedParseContext {
	id: NodeId
}

export interface NodeParseContextInput<kind extends NodeKind = NodeKind>
	extends BaseParseContextInput {
	kind: kind
	def: NodeInput<kind>
}

export interface NodeParseContext<kind extends NodeKind = NodeKind> {
	kind: kind
	def: NodeInput<kind>
	$: BaseScope
	id: NodeId
	prereduced: boolean | undefined
}

export const writeInvalidSchemaMessage = (schema: unknown): string =>
	`${printable(schema)} is not a valid type schema`

const nodeCountsByPrefix: PartialRecord<string, number> = Object.create(null)

export type NodeId = Brand<string, "NodeId">

export type NodeResolver = (id: NodeId) => BaseNode

export const nodesByRegisteredId: Record<
	NodeId,
	BaseNode | BaseParseContext | undefined
> = {}

$ark.nodesByRegisteredId = nodesByRegisteredId

export const registerNodeId = (prefix: string): NodeId => {
	if (/\d$/.test(prefix)) prefix += "_"
	nodeCountsByPrefix[prefix] ??= 0
	return `${prefix}${++nodeCountsByPrefix[prefix]!}` as NodeId
}

export const parseNode = (ctx: NodeParseContext): BaseNode => {
	const impl = nodeImplementationsByKind[ctx.kind]
	const input = (impl.applyConfig?.(ctx.def, ctx.$.resolvedConfig) ??
		ctx.def) as dict & { meta?: ArkEnv.meta | string }

	const metaInput = input.meta
	const meta: ArkEnv.meta =
		metaInput === undefined ? {}
		: typeof metaInput === "string" ? { description: metaInput }
		: metaInput

	const keys = Object.keys(input)
	// most schemas list their keys in order already
	for (let i = 1; i < keys.length; i++) {
		if (compareInnerKeys(keys[i - 1], keys[i]) > 0) {
			keys.sort(compareInnerKeys)
			break
		}
	}

	const inner: dict = {}
	for (const k of keys) {
		if (k === "meta") continue
		const keyImpl = impl.keys[k]
		if (!keyImpl)
			return throwParseError(`Key ${k} is not valid on ${ctx.kind} schema`)
		const v = input[k]
		if (v === undefined && !keyImpl.preserveUndefined) continue
		// an empty list of children is none, except a union's branches
		if (keyImpl.child && isArray(v) && !v.length && k !== "branches") continue
		inner[k] = keyImpl.structural ? deferAliases(v, ctx.$) : v
	}

	if ($ark.sets) {
		$ark.sets.sort(ctx.kind, inner)
		if (!ctx.prereduced) {
			const reduced = $ark.sets.reduce(ctx.kind, inner, ctx.$)
			if (reduced) {
				if (reduced instanceof Disjoint) return reduced.throw()

				// we can't cache this reduction for now in case the reduction involved
				// impliedSiblings
				return withMeta(reduced, meta)
			}
		}
	}

	const node = createNode({
		id: ctx.id,
		kind: ctx.kind,
		inner,
		meta,
		$: ctx.$
	})

	return node
}

// keys are ordered so equal inners share a key and json, with children
// after other values in order of precedence
const compareInnerKeys = (l: string, r: string) =>
	isNodeKind(l) ?
		isNodeKind(r) ? precedenceOfKind(l) - precedenceOfKind(r)
		:	1
	: isNodeKind(r) ? -1
	: l < r ? -1
	: 1

// an alias belongs in a structural value, so a value holding one elsewhere is
// deferred to an alias of its own
const deferAliases = (v: unknown, $: BaseScope): unknown => {
	if (isArray(v)) {
		const deferred = v.map(element => deferAliases(element, $))
		return deferred.some((element, i) => element !== v[i]) ? deferred : v
	}
	if (!isNode(v) || !v.includesShallowAlias || v.hasKind("alias")) return v
	nodesByRegisteredId[v.id] = v
	return $.node("alias", { reference: v.id }, { prereduced: true })
}

export type CreateNodeInput = {
	id: NodeId
	kind: NodeKind
	inner: dict
	meta: ArkEnv.meta
	$: BaseScope
	ignoreCache?: true
}

export const createNode = ({
	id,
	kind,
	inner,
	meta,
	$,
	ignoreCache
}: CreateNodeInput): BaseNode => {
	// serialized as the node is created, so meta that can't be throws here
	const metaJson = isEmptyObject(meta) ? undefined : metaJsonOf(meta)

	// nodes are only cached with a set engine, which reduces them first
	const key =
		ignoreCache || !$ark.sets ? undefined : nodeKeyOf(kind, inner, metaJson)

	if (key) {
		const cached = $.nodesByKey.get(key)
		if (cached) {
			$ark.reached?.node(cached)
			return cached
		}
	}

	const impl = nodeImplementationsByKind[kind]
	const children: BaseNode[] = []

	for (const k in inner) {
		const keyImpl = impl.keys[k]
		if (keyImpl.child === true) {
			const listableNode = inner[k] as listable<BaseNode>
			if (isArray(listableNode)) children.push(...listableNode)
			else children.push(listableNode)
		} else if (typeof keyImpl.child === "function")
			children.push(...keyImpl.child(inner[k] as never))
	}

	const attachments: UnknownAttachmentsInput = {
		id,
		kind,
		impl,
		inner,
		meta,
		metaJson,
		children
	}

	const node = composing(() =>
		resolveDescription(new nodeClassesByKind[kind](attachments, $))
	)

	return key ? $.nodesByKey.set(key, node) : node
}

// a node's children are cached before it, so their ids can stand in for
// their content
const nodeKeyOf = (
	kind: NodeKind,
	inner: dict,
	metaJson: JsonObject | undefined
): string => {
	let key: string = kind
	for (const k in inner)
		key += `,${k}:${k === "unit" ? literalKeyOf(inner[k]) : valueKeyOf(inner[k])}`
	// an alias inlines a reference that has resolved when it's written
	if (
		kind === "alias" &&
		hasArkKind(nodesByRegisteredId[inner.reference as NodeId], "root")
	)
		key += "!"
	return metaJson ? key + JSON.stringify(metaJson) : key
}

const valueKeyOf = (v: unknown): string =>
	isNode(v) ? `#${v.id}`
	: isArray(v) ? `[${v.map(valueKeyOf).join()}]`
	: literalKeyOf(v)

// objects are compared by reference, except dates, which units compare by value
const literalKeyOf = (v: unknown): string =>
	typeof v === "string" ? JSON.stringify(v)
	: typeof v === "number" ?
		Object.is(v, -0) ?
			"-0"
		:	`${v}`
	: typeof v === "bigint" ? `${v}n`
	: isDate(v) ? `d'${v.toISOString()}'`
	: (
		(typeof v === "object" && v !== null) ||
		typeof v === "function" ||
		typeof v === "symbol"
	) ?
		`$${nameOf(v)}`
	:	`${v}`

// a basis or primitive constraint's error context includes its description,
// so its writer runs on construction whether or not the node is compiled
export const resolveDescription = <node extends BaseNode>(node: node): node => {
	if (node.isBasis() || includes(prestructuralKinds, node.kind))
		void node.description
	return node
}

export const withId = <node extends BaseNode>(node: node, id: NodeId): node => {
	if (node.id === id) return node
	if (isNode(nodesByRegisteredId[id]))
		throwInternalError(`Unexpected attempt to overwrite node id ${id}`)
	// have to ignore cache to force creation of new potentially cyclic id
	return createNode({
		id,
		kind: node.kind,
		inner: node.inner,
		meta: node.meta,
		$: node.$,
		ignoreCache: true
	}) as never
}

export const withMeta = <node extends BaseNode>(
	node: node,
	meta: ArkEnv.meta,
	id?: NodeId
): node => {
	if (id && isNode(nodesByRegisteredId[id]))
		throwInternalError(`Unexpected attempt to overwrite node id ${id}`)
	return createNode({
		id: id ?? registerNodeId(meta.alias ?? node.kind),
		kind: node.kind,
		inner: node.inner,
		meta,
		$: node.$
	}) as never
}
