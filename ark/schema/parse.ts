/// <reference lib="es2021.weakref" />

import {
	hasOwn,
	holdsWeakly,
	includes,
	isArray,
	isDate,
	isEmptyObject,
	nameOf,
	printable,
	throwInternalError,
	throwParseError,
	timeOf,
	type arkKind,
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
import { $ark, nodesById, type NodeId } from "./shared/registry.ts"
import { composing, hasArkKind, isNode } from "./shared/utils.ts"
import type { ArkEnv } from "./shared/declare.ts"

export type ContextualArgs = Record<string, BaseRoot | NodeId>

export type BaseParseOptions<reduced extends boolean = boolean> = {
	alias?: string
	reduced?: reduced
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
	reduced: boolean | undefined
}

export const writeInvalidSchemaMessage = (schema: unknown): string =>
	`${printable(schema)} is not a valid type schema`

const nodeCountsByPrefix: PartialRecord<string, number> = Object.create(null)

export { nodesById, type NodeId }

export type NodeResolver = (id: NodeId) => BaseNode

// compiled code declares functions by id, so an alias prefix is written as an identifier
export const registerNodeId = (written: string): NodeId => {
	const prefix = (idPrefixes[written] ??= idPrefixOf(written))
	const count = (nodeCountsByPrefix[prefix] ?? 0) + 1
	nodeCountsByPrefix[prefix] = count
	return `${prefix}${count}` as NodeId
}

const idPrefixes: PartialRecord<string, string> = Object.create(null)

const idPrefixOf = (written: string): string => {
	let prefix = written.replace(/[^\w$]/g, "_")
	if (!prefix || /^\d/.test(prefix)) prefix = `_${prefix}`
	if (/\d$/.test(prefix)) prefix += "_"
	return prefix
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
	for (let i = 0; i < keys.length; i++) {
		const k = keys[i]
		if (k === "meta") continue
		// own keys only, so one Object.prototype has, like toString, isn't valid
		const keyImpl = hasOwn(impl.keys, k) ? impl.keys[k] : undefined
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
		if (!ctx.reduced) {
			const reduced = $ark.sets.reduce(ctx.kind, inner, ctx.$)
			if (reduced) {
				if (reduced instanceof Disjoint) return reduced.throw()

				const hasMeta =
					!isEmptyObject(meta) || Object.getOwnPropertySymbols(meta).length > 0

				// a node already keyed with the meta it would get needs no key written
				if (reduced.c.key && !hasMeta) {
					$ark.reached?.node(reduced)
					return reduced
				}

				// we can't cache this reduction for now in case the reduction involved
				// impliedBy. a schema with no meta of its own keeps what it reduced
				// to, so a union of equal described branches is that branch
				return withMeta(reduced, hasMeta ? meta : reduced.meta)
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

// children after other values, in order of precedence
export const compareInnerKeys = (l: string, r: string): number =>
	isNodeKind(l) ?
		isNodeKind(r) ? precedenceOfKind(l) - precedenceOfKind(r)
		:	1
	: isNodeKind(r) ? -1
	: l < r ? -1
	: 1

// a value holding an alias outside a structure is deferred to an alias of its own
export const deferAliases = (v: unknown, $: BaseScope): unknown => {
	if (isArray(v)) {
		const deferred = v.map(element => deferAliases(element, $))
		return deferred.some((element, i) => element !== v[i]) ? deferred : v
	}
	if (!isNode(v) || !v.topAlias || v.is("alias")) return v
	nodesById[v.id] = v
	return $.node("alias", { reference: v.id }, { reduced: true })
}

const noChildren: BaseNode[] = []

export type CreateNodeInput = {
	id: NodeId | undefined
	alias?: string | undefined
	kind: NodeKind
	inner: dict
	meta: ArkEnv.meta
	$: BaseScope
	ignoreCache?: true
	shell?: DeferredShell | undefined
}

export interface DeferredShell {
	fn: Function
	c: object
}

/** the id of the node created last, so a deferred Type can tell it reached a new one */
export let lastCreated: string | undefined

export const createNode = ({
	id,
	alias,
	kind,
	inner,
	meta,
	$,
	ignoreCache,
	shell
}: CreateNodeInput): BaseNode => {
	// serialized as the node is created, so meta that can't be throws here
	const metaJson = isEmptyObject(meta) ? undefined : metaJsonOf(meta)
	const impl = nodeImplementationsByKind[kind]

	// nodes are only cached with a set engine, which reduces them first
	const key =
		ignoreCache || !$ark.sets ?
			undefined
		:	nodeKeyOf(kind, impl, inner, meta, metaJson, $)

	if (key) {
		const cached = $.nodesByKey.get(key)
		// one whose check was thrown, or discarded with its definition, before it
		// passed is created again, which makes the check again
		if (cached && !cached.c.unchecked) {
			$ark.reached?.node(cached)
			return cached
		}
	}

	let children: BaseNode[] = noChildren
	for (const k in inner) {
		const keyImpl = impl.keys[k]
		if (!keyImpl.child) continue
		const value = inner[k] as listable<BaseNode>
		const held =
			keyImpl.child === true ?
				isArray(value) ? value
				:	[value]
			:	keyImpl.child(value as never)
		// held by a union or a list alone, it's that list
		children =
			children === noChildren ? (held as BaseNode[]) : children.concat(held)
	}

	const attachments: UnknownAttachmentsInput = {
		id: id ?? registerNodeId(alias ?? kind),
		kind,
		impl,
		inner,
		meta,
		metaJson,
		children,
		shell
	}

	const node = composing(() =>
		resolveDescription(new nodeClassesByKind[kind](attachments, $))
	)

	if (key) {
		node.c.key = key
		$.nodesByKey.set(key, node)
	}
	lastCreated = node.id
	return node
}

// children are cached before their parent, so their ids stand in for their content
// a reference bound to a scope keeps its original's id, so a child from
// another scope is keyed by that scope too
const nodeKeyOf = (
	kind: NodeKind,
	impl: UnknownNodeImplementation,
	inner: dict,
	meta: ArkEnv.meta,
	metaJson: JsonObject | undefined,
	$: BaseScope
): string => {
	let key: string = kind
	for (const k in inner) {
		const v = inner[k]
		key += `,${k}:${
			impl.keys[k].child === true ?
				isArray(v) ? `[${idsOf(v as BaseNode[], $)}]`
				:	idOf(v as BaseNode, $)
			: k === "unit" ? literalKeyOf(v)
			: valueKeyOf(v, $)
		}`
	}
	// an alias inlines a reference that has resolved when it's written
	if (
		kind === "alias" &&
		hasArkKind(nodesById[inner.reference as NodeId], "root")
	)
		key += ",!"
	if (metaJson) key += `,${JSON.stringify(metaJson)}`
	// meta's json drops symbol keys, so they're keyed by name as a symbol unit is
	const symbols = Object.getOwnPropertySymbols(meta)
	for (let i = 0; i < symbols.length; i++) {
		key += `,[$${nameOf(symbols[i])}]:${literalKeyOf(
			(meta as Record<symbol, unknown>)[symbols[i]]
		)}`
	}
	return key
}

const idsOf = (nodes: readonly BaseNode[], $: BaseScope): string => {
	let ids = ""
	for (let i = 0; i < nodes.length; i++)
		ids += i === 0 ? idOf(nodes[i], $) : `,${idOf(nodes[i], $)}`
	return ids
}

const idOf = (node: BaseNode, $: BaseScope): string =>
	node.$ === $ ? `#${node.id}` : `#${node.id}@${node.$.index}`

const valueKeyOf = (v: unknown, $: BaseScope): string =>
	isNode(v) ? idOf(v, $)
	: isArray(v) ? `[${v.map(item => valueKeyOf(item, $)).join()}]`
	: literalKeyOf(v)

// objects are compared by reference, except dates, which units compare by value
const literalKeyOf = (v: unknown): string =>
	typeof v === "string" ? JSON.stringify(v)
	: typeof v === "number" ?
		Object.is(v, -0) ?
			"-0"
		:	`${v}`
	: typeof v === "bigint" ? `${v}n`
	: isDate(v) ? dateKeyOf(v)
	: (
		(typeof v === "object" && v !== null) ||
		typeof v === "function" ||
		typeof v === "symbol"
	) ?
		`$${nameOf(v)}`
	:	`${v}`

const dateKeyOf = (v: Date): string => {
	const time = timeOf(v)
	return (
		time === undefined ? `$${nameOf(v)}`
		: Number.isNaN(time) ? "d'Invalid Date'"
		: `d'${v.toISOString()}'`
	)
}

// props of a value without an alias are found by key before parsing
export const requiredPropOf = (
	key: Key,
	value: BaseRoot,
	$: BaseScope
): nodeOfKind<"required"> => {
	if (!holdsWeakly || value.topAlias || value.$ !== $)
		return $.node("required", { key, value })
	const props = (value.c.requiredProps ??= new Map())
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

// a configured writer runs on construction, as a basis's error context includes its description
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
		// a copy, since an inner holds what its node is registered under, and
		// `node` can be a keyword, which is held for good
		inner: { ...node.inner },
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
