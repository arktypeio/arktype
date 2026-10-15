import {
	entriesOf,
	flatMorph,
	isArray,
	isEmptyObject,
	nameOf,
	printable,
	throwInternalError,
	throwParseError,
	type Brand,
	type dict,
	type Entry,
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
	defaultValueSerializer,
	isNodeKind,
	precedenceOfKind,
	type NodeKind,
	type UnknownAttachments
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import { hasArkKind, isNode, type arkKind } from "./shared/utils.ts"

export type ContextualArgs = Record<string, BaseRoot | NodeId>

export type BaseParseOptions<prereduced extends boolean = boolean> = {
	alias?: string
	prereduced?: prereduced
	args?: ContextualArgs
	id?: NodeId
}

export interface BaseParseContextInput extends BaseParseOptions {
	prefix: string
	def: unknown
}

export interface AttachedParseContext {
	[arkKind]: "context"
	$: BaseScope
	id: NodeId
	phase: "unresolved" | "resolving" | "member" | "resolved"
	isReferencedById?: true
	index?: number
	lowlink?: number
	closesCycle?: true
	resolution?: BaseRoot
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

export interface NodeParseContext<kind extends NodeKind = NodeKind>
	extends NodeParseContextInput<kind>,
		AttachedParseContext {
	id: NodeId
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
	const { meta: metaInput, ...input } = (impl.applyConfig?.(
		ctx.def,
		ctx.$.resolvedConfig
	) ?? ctx.def) as dict & { meta?: ArkEnv.meta | string }

	const meta: ArkEnv.meta =
		metaInput === undefined ? {}
		: typeof metaInput === "string" ? { description: metaInput }
		: metaInput

	// keys are ordered so equal inners share a key and json, with children
	// after other values in order of precedence
	const keys = Object.keys(input).sort((l, r) =>
		isNodeKind(l) ?
			isNodeKind(r) ? precedenceOfKind(l) - precedenceOfKind(r)
			:	1
		: isNodeKind(r) ? -1
		: l < r ? -1
		: 1
	)

	const inner: dict = {}
	for (const k of keys) {
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
	const impl = nodeImplementationsByKind[kind]
	const innerEntries = entriesOf(inner)
	const children: BaseNode[] = []

	for (const [k, v] of innerEntries) {
		const keyImpl = impl.keys[k]
		if (keyImpl.child === true) {
			const listableNode = v as listable<BaseNode>
			if (isArray(listableNode)) children.push(...listableNode)
			else children.push(listableNode)
		} else if (typeof keyImpl.child === "function")
			children.push(...keyImpl.child(v as never))
	}

	const metaJson: dict =
		isEmptyObject(meta) ?
			{}
		:	flatMorph(meta, (k, v) => [
				k,
				k === "examples" ? v : defaultValueSerializer(v)
			])

	// nodes are only cached with a set engine, which reduces them first
	const key =
		ignoreCache || !$ark.sets ?
			undefined
		:	nodeKeyOf(kind, inner, innerEntries, metaJson)

	if (key) {
		const cached = $.nodesByKey.get(key)
		if (cached) return cached
	}

	const attachments: UnknownAttachments = {
		id,
		kind,
		impl,
		inner,
		innerEntries,
		meta,
		metaJson,
		children
	}

	const node: BaseNode = new nodeClassesByKind[kind](attachments as never, $)

	return key ? $.nodesByKey.set(key, node) : node
}

// a node's children are cached before it, so their ids can stand in for
// their content
const nodeKeyOf = (
	kind: NodeKind,
	inner: dict,
	innerEntries: readonly Entry<string>[],
	metaJson: dict
): string => {
	let key: string = kind
	for (const [k, v] of innerEntries)
		key += `,${k}:${k === "unit" ? literalKeyOf(v) : valueKeyOf(v)}`
	// an alias inlines a reference that has resolved when it's written
	if (
		kind === "alias" &&
		hasArkKind(nodesByRegisteredId[inner.reference as NodeId], "root")
	)
		key += "!"
	return isEmptyObject(metaJson) ? key : key + JSON.stringify(metaJson)
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
	: v instanceof Date ? `d'${v.toISOString()}'`
	: (
		(typeof v === "object" && v !== null) ||
		typeof v === "function" ||
		typeof v === "symbol"
	) ?
		`$${nameOf(v)}`
	:	`${v}`

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
