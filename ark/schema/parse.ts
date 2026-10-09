import {
	domainDescriptions,
	entriesOf,
	flatMorph,
	isArray,
	isEmptyObject,
	nameOf,
	printable,
	throwInternalError,
	throwParseError,
	unset,
	type Brand,
	type dict,
	type Entry,
	type listable,
	type PartialRecord
} from "@ark/util"
import {
	nodeClassesByKind,
	nodeImplementationsByKind,
	type NormalizedSchema
} from "./kinds.ts"
import type { BaseNode } from "./node.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import type { TypeMeta } from "./shared/declare.ts"
import { Disjoint } from "./shared/disjoint.ts"
import {
	constraintKeys,
	defaultValueSerializer,
	isNodeKind,
	precedenceOfKind,
	type NodeKind,
	type RootKind,
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
	def: NormalizedSchema<kind>
}

export interface NodeParseContext<kind extends NodeKind = NodeKind>
	extends NodeParseContextInput<kind>,
		AttachedParseContext {
	id: NodeId
}

export const schemaKindOf = <kind extends RootKind = RootKind>(
	schema: unknown,
	allowedKinds?: readonly kind[]
): kind => {
	const kind = discriminateRootKind(schema)
	if (allowedKinds && !allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Root of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return kind as never
}

const discriminateRootKind = (schema: unknown): RootKind => {
	if (hasArkKind(schema, "root")) return schema.kind
	if (typeof schema === "string") {
		return (
			schema[0] === "$" ? "alias"
			: schema in domainDescriptions ? "domain"
			: "proto"
		)
	}
	if (typeof schema === "function") return "proto"

	// throw at end of function
	if (typeof schema !== "object" || schema === null)
		return throwParseError(writeInvalidSchemaMessage(schema))

	if ("morphs" in schema) return "morph"

	if ("branches" in schema || isArray(schema)) return "union"

	if ("unit" in schema) return "unit"

	if ("reference" in schema) return "alias"

	const schemaKeys = Object.keys(schema)

	if (schemaKeys.length === 0 || schemaKeys.some(k => k in constraintKeys))
		return "intersection"
	if ("proto" in schema) return "proto"
	if ("domain" in schema) return "domain"

	return throwParseError(writeInvalidSchemaMessage(schema))
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
	const configuredSchema =
		impl.applyConfig?.(ctx.def, ctx.$.resolvedConfig) ?? ctx.def
	const inner: dict = {}
	const { meta: metaSchema, ...innerSchema } = configuredSchema as dict & {
		meta?: TypeMeta.Collapsible
	}

	const meta: ArkEnv.meta & dict =
		metaSchema === undefined ? {}
		: typeof metaSchema === "string" ? { description: metaSchema }
		: (metaSchema as never)

	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const innerSchemaEntries = entriesOf(innerSchema)
		.sort(([lKey], [rKey]) =>
			isNodeKind(lKey) ?
				isNodeKind(rKey) ? precedenceOfKind(lKey) - precedenceOfKind(rKey)
				:	1
			: isNodeKind(rKey) ? -1
			: lKey < rKey ? -1
			: 1
		)
		.filter(([k, v]) => {
			// move meta. prefixed props to meta, overwriting existing nested
			// props of the same name if they exist
			if (k.startsWith("meta.")) {
				const metaKey = k.slice(5)
				meta[metaKey] = v
				return false
			}
			return true
		})

	for (const entry of innerSchemaEntries) {
		const k = entry[0]
		const keyImpl = impl.keys[k]
		if (!keyImpl)
			return throwParseError(`Key ${k} is not valid on ${ctx.kind} schema`)

		const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
		if (v !== unset && (v !== undefined || keyImpl.preserveUndefined))
			inner[k] = v
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
