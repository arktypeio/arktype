import {
	entriesOf,
	flatMorph,
	hasDomain,
	isArray,
	isEmptyObject,
	printable,
	throwParseError,
	unset,
	type Json,
	type JsonData,
	type PartialRecord,
	type dict,
	type listable
} from "@ark/util"
import type { GenericArgResolutions } from "./generic.js"
import {
	nodeClassesByKind,
	nodeImplementationsByKind,
	type NormalizedSchema
} from "./kinds.js"
import type { BaseNode } from "./node.js"
import type { BaseScope } from "./scope.js"
import type { BaseMeta, MetaSchema } from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import {
	constraintKeys,
	defaultValueSerializer,
	isNodeKind,
	precedenceOfKind,
	type NodeKind,
	type RootKind,
	type UnknownAttachments
} from "./shared/implement.js"
import { hasArkKind } from "./shared/utils.js"

export type NodeParseOptions<prereduced extends boolean = boolean> = {
	alias?: string
	prereduced?: prereduced
	/** Instead of creating the node, compute the innerHash of the definition and
	 * point it to the specified resolution.
	 *
	 * Useful for defining reductions like number|string|bigint|symbol|object|true|false|null|undefined => unknown
	 **/
	reduceTo?: BaseNode
	args?: GenericArgResolutions
}

export interface NodeParseContext<kind extends NodeKind = NodeKind>
	extends NodeParseOptions {
	$: BaseScope
	args: GenericArgResolutions
	schema: NormalizedSchema<kind>
	id: string
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
	if (typeof schema === "string") return schema[0] === "$" ? "alias" : "domain"
	if (typeof schema === "function") return "proto"

	// throw at end of function
	if (typeof schema !== "object" || schema === null)
		return throwParseError(writeInvalidSchemaMessage(schema))

	if ("morphs" in schema) return "morph"

	if ("branches" in schema || isArray(schema)) return "union"

	if ("unit" in schema) return "unit"

	if ("alias" in schema) return "alias"

	const schemaKeys = Object.keys(schema)

	if (schemaKeys.length === 0 || schemaKeys.some(k => k in constraintKeys))
		return "intersection"
	if ("proto" in schema) return "proto"
	if ("domain" in schema) return "domain"

	return throwParseError(writeInvalidSchemaMessage(schema))
}

export const writeInvalidSchemaMessage = (schema: unknown): string =>
	`${printable(schema)} is not a valid type schema`

const nodeCache: { [hash: string]: BaseNode } = {}
const nodeCountsByPrefix: PartialRecord<string, number> = {}

const serializeListableChild = (listableNode: listable<BaseNode>) =>
	isArray(listableNode) ?
		listableNode.map(node => node.collapsibleJson)
	:	listableNode.collapsibleJson

export const registerNodeId = (kind: NodeKind, alias?: string): string => {
	const prefix = alias ?? kind
	nodeCountsByPrefix[prefix] ??= 0
	return `${prefix}${++nodeCountsByPrefix[prefix]!}`
}

export const parseNode = <kind extends NodeKind>(
	id: string,
	kind: kind,
	schema: NormalizedSchema<kind>,
	$: BaseScope,
	opts: NodeParseOptions
): BaseNode => {
	const ctx: NodeParseContext = {
		...opts,
		$,
		args: opts.args ?? {},
		schema,
		id
	}
	return _parseNode(kind, ctx)
}

const _parseNode = (kind: NodeKind, ctx: NodeParseContext): BaseNode => {
	const impl = nodeImplementationsByKind[kind]
	const inner: dict = {}
	const { meta: metaSchema, ...schema } = ctx.schema as dict & {
		meta?: MetaSchema
	}

	const meta: BaseMeta & dict =
		metaSchema === undefined ? {}
		: typeof metaSchema === "string" ? { description: metaSchema }
		: (metaSchema as never)

	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const innerSchemaEntries = entriesOf(schema)
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
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)

		const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
		if (v !== unset && (v !== undefined || keyImpl.preserveUndefined))
			inner[k] = v
	}

	if (impl.reduce && !ctx.prereduced) {
		const reduced = impl.reduce(inner, ctx.$)
		if (reduced) {
			if (reduced instanceof Disjoint) return reduced.throw()

			// we can't cache this reduction for now in case the reduction involved
			// impliedSiblings
			return withMeta(reduced, meta)
		}
	}

	const node = createNode(ctx.id, kind, inner, meta, ctx.$)

	if (ctx.reduceTo) {
		nodeCache[node.hash] = ctx.reduceTo
		return ctx.reduceTo
	}

	return node
}

export const createNode = (
	id: string,
	kind: NodeKind,
	inner: dict,
	meta: BaseMeta,
	$: BaseScope
): BaseNode => {
	const impl = nodeImplementationsByKind[kind]
	const innerEntries = entriesOf(inner)
	const children: BaseNode[] = []
	let innerJson: dict = {}

	innerEntries.forEach(([k, v]) => {
		const keyImpl = impl.keys[k]
		const serialize =
			keyImpl.serialize ??
			(keyImpl.child ? serializeListableChild : defaultValueSerializer)

		innerJson[k] = serialize(v as never)

		if (keyImpl.child) {
			const listableNode = v as listable<BaseNode>
			if (isArray(listableNode)) children.push(...listableNode)
			else children.push(listableNode)
		}
	})

	if (impl.finalizeInnerJson)
		innerJson = impl.finalizeInnerJson(innerJson) as never

	let json = { ...innerJson }

	if (!isEmptyObject(meta)) {
		json.meta = possiblyCollapse(
			flatMorph(meta, (k, v) => [k, defaultValueSerializer(v)]),
			"description",
			true
		)
	}

	innerJson = possiblyCollapse(innerJson, impl.collapsibleKey, false)
	const innerHash = JSON.stringify({ kind, ...innerJson })

	json = possiblyCollapse(json, impl.collapsibleKey, false)
	const collapsibleJson = possiblyCollapse(json, impl.collapsibleKey, true)
	const hash = JSON.stringify({ kind, ...json })

	// we have to wait until after reduction to return a cached entry,
	// since reduction can add impliedSiblings
	if (nodeCache[hash]) return nodeCache[hash]

	const attachments: UnknownAttachments & dict = {
		id,
		kind,
		impl,
		inner,
		innerEntries,
		innerJson: innerJson as Json,
		innerHash,
		meta,
		json,
		hash,
		collapsibleJson: collapsibleJson as JsonData,
		children
	}

	for (const k in inner)
		if (k !== "in" && k !== "out") attachments[k] = inner[k]

	const node: BaseNode = new nodeClassesByKind[kind](attachments as never, $)

	return (nodeCache[hash] = node)
}

export const withMeta = (node: BaseNode, meta: ArkEnv.meta): BaseNode =>
	createNode(
		registerNodeId(node.kind, meta.alias),
		node.kind,
		node.inner,
		meta,
		node.$
	) as never

const possiblyCollapse = <allowPrimitive extends boolean>(
	json: dict,
	toKey: string | undefined,
	allowPrimitive: allowPrimitive
): [allowPrimitive] extends [false] ? dict : unknown => {
	const collapsibleKeys = Object.keys(json)
	if (collapsibleKeys.length === 1 && collapsibleKeys[0] === toKey) {
		const collapsed = json[toKey]

		if (allowPrimitive) return collapsed as never

		if (
			// if the collapsed value is still an object
			hasDomain(collapsed, "object") &&
			// and the JSON did not include any implied keys
			(Object.keys(collapsed).length === 1 || Array.isArray(collapsed))
		) {
			// we can replace it with its collapsed value
			return collapsed as never
		}
	}
	return json as never
}
