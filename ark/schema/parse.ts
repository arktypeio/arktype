/// <reference lib="es2021.weakref" />

import {
	holdsWeakly,
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
	type Key,
	type listable,
	type PartialRecord
} from "@ark/util"
import {
	nodeClassesByKind,
	nodeImplementationsByKind,
	type NodeInput,
	type nodeOfKind
} from "./kinds.ts"
import type { BaseNode } from "./node.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import { Disjoint } from "./shared/disjoint.ts"
import {
	isNodeKind,
	metaJsonOf,
	precedenceOfKind,
	prestructuralKinds,
	type NodeKind,
	type UnknownAttachmentsInput,
	type UnknownNodeImplementation
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import { composing, hasArkKind, isNode } from "./shared/utils.ts"

export type ContextualArgs = Record<string, BaseRoot | NodeId>

export type BaseParseOptions<prereduced extends boolean = boolean> = {
	alias?: string
	prereduced?: prereduced
	args?: ContextualArgs
	id?: NodeId
	// printed for an anonymous cycle's references in place of this
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
	/** whether a reference reached it while it was resolving */
	closes?: true
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
	// registered only if a node is created
	id: NodeId | undefined
	alias: string | undefined
	prereduced: boolean | undefined
}

export const writeInvalidSchemaMessage = (schema: unknown): string =>
	`${printable(schema)} is not a valid type schema`

const nodeCountsByPrefix: PartialRecord<string, number> = Object.create(null)

export type NodeId = Brand<string, "NodeId">

export type NodeResolver = (id: NodeId) => BaseNode

export const nodesById: Record<
	NodeId,
	BaseNode | BaseParseContext | undefined
> = {}

$ark.nodesById = nodesById

export const registerNodeId = (prefix: string): NodeId => {
	if (/\d$/.test(prefix)) prefix += "_"
	nodeCountsByPrefix[prefix] ??= 0
	return `${prefix}${++nodeCountsByPrefix[prefix]!}` as NodeId
}

export const parseNode = (ctx: NodeParseContext): BaseNode => {
	const impl = nodeImplementationsByKind[ctx.kind]
	const input = (impl.applyConfig?.(ctx.def, ctx.$.cfg) ?? ctx.def) as dict & {
		meta?: ArkEnv.meta | string
	}

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
		if (v === undefined && !keyImpl.keepUndef) continue
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
				// impliedBy
				return withMeta(reduced, meta)
			}
		}
	}

	return createNode({
		id: ctx.id,
		alias: ctx.alias,
		kind: ctx.kind,
		inner,
		meta,
		$: ctx.$
	})
}

// keys are ordered so equal inners share a key and json, with children
// after other values in order of precedence
export const compareInnerKeys = (l: string, r: string): number =>
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
	if (!isNode(v) || !v.topAlias || v.is("alias")) return v
	nodesById[v.id] = v
	return $.node("alias", { reference: v.id }, { prereduced: true })
}

export type CreateNodeInput = {
	id: NodeId | undefined
	alias?: string | undefined
	kind: NodeKind
	inner: dict
	meta: ArkEnv.meta
	$: BaseScope
	ignoreCache?: true
}

export const createNode = ({
	id,
	alias,
	kind,
	inner,
	meta,
	$,
	ignoreCache
}: CreateNodeInput): BaseNode => {
	// serialized as the node is created, so meta that can't be throws here
	const metaJson = isEmptyObject(meta) ? undefined : metaJsonOf(meta)
	const impl = nodeImplementationsByKind[kind]

	// nodes are only cached with a set engine, which reduces them first
	const key =
		ignoreCache || !$ark.sets ?
			undefined
		:	nodeKeyOf(kind, impl, inner, metaJson)

	if (key) {
		const cached = $.nodesByKey.get(key)
		if (cached) {
			$ark.reached?.node(cached)
			return cached
		}
	}

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
		id: id ?? registerNodeId(alias ?? kind),
		kind,
		impl,
		inner,
		meta,
		metaJson,
		// copied to its exact length
		children: children.slice()
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
	impl: UnknownNodeImplementation,
	inner: dict,
	metaJson: JsonObject | undefined
): string => {
	const parts: string[] = [kind]
	for (const k in inner) {
		const v = inner[k]
		parts.push(
			`${k}:${
				impl.keys[k].child === true ?
					isArray(v) ? `[${idsOf(v as BaseNode[])}]`
					:	`#${(v as BaseNode).id}`
				: k === "unit" ? literalKeyOf(v)
				: valueKeyOf(v)
			}`
		)
	}
	// an alias inlines a reference that has resolved when it's written
	if (
		kind === "alias" &&
		hasArkKind(nodesById[inner.reference as NodeId], "root")
	)
		parts.push("!")
	if (metaJson) parts.push(JSON.stringify(metaJson))
	return parts.join()
}

const idsOf = (nodes: readonly BaseNode[]): string => {
	let ids = ""
	for (let i = 0; i < nodes.length; i++)
		ids += i === 0 ? `#${nodes[i].id}` : `,#${nodes[i].id}`
	return ids
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

// props of a value without an alias are found by key before parsing
export const requiredPropOf = (
	key: Key,
	value: BaseRoot,
	$: BaseScope
): nodeOfKind<"required"> => {
	if (!holdsWeakly || value.topAlias || value.$ !== $)
		return $.node("required", { key, value })
	const props = (value.cache.requiredProps ??= new Map())
	let prop = props.get(key)?.deref()
	if (prop) $ark.reached?.node(prop)
	else {
		// keys whose props were collected are dropped as the map doubles
		if (props.size > 32 && !(props.size & (props.size - 1)))
			for (const [k, ref] of props) if (!ref.deref()) props.delete(k)
		prop = $.node("required", { key, value })
		props.set(key, new WeakRef(prop))
	}
	return prop as nodeOfKind<"required">
}

// a basis or primitive constraint's error context includes its description,
// so a configured writer runs on construction whether or not the node is
// compiled, while a built-in one, which reads only the node, runs when read
export const resolveDescription = <node extends BaseNode>(node: node): node => {
	if (node.isBasis() || includes(prestructuralKinds, node.kind)) {
		if (
			node.$.cfg[node.kind].description !==
			$ark.defaultConfig[node.kind].description
		)
			void node.description
	}
	// an alias's expression changes as it resolves, so write it now
	else if (node.hasAlias) void node.expression
	return node
}

export const withId = <node extends BaseNode>(node: node, id: NodeId): node => {
	if (node.id === id) return node
	if (isNode(nodesById[id]))
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
	if (id && isNode(nodesById[id]))
		throwInternalError(`Unexpected attempt to overwrite node id ${id}`)
	return createNode({
		id,
		alias: meta.alias,
		kind: node.kind,
		inner: node.inner,
		meta,
		$: node.$
	}) as never
}
