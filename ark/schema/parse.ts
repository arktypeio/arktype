import {
	entriesOf,
	hasDomain,
	isArray,
	printable,
	throwParseError,
	unset,
	type Dict,
	type Json,
	type JsonData,
	type PartialRecord,
	type dict,
	type listable
} from "@arktype/util"
import type { GenericArgResolutions } from "./generic.js"
import {
	nodeClassesByKind,
	nodeImplementationsByKind,
	type NormalizedSchema
} from "./kinds.js"
import type { BaseNode } from "./node.js"
import type { RawRootScope } from "./scope.js"
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
	$: RawRootScope
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

export const writeInvalidSchemaMessage = (schema: unknown) =>
	`${printable(schema)} is not a valid type schema`

const nodeCache: { [innerHash: string]: BaseNode } = {}
const nodeCountsByPrefix: PartialRecord<string, number> = {}

const serializeListableChild = (listableNode: listable<BaseNode>) =>
	isArray(listableNode) ?
		listableNode.map(node => node.collapsibleJson)
	:	listableNode.collapsibleJson

export const registerNodeId = (kind: NodeKind, opts: NodeParseOptions) => {
	const prefix = opts.alias ?? kind
	nodeCountsByPrefix[prefix] ??= 0
	return `${prefix}${++nodeCountsByPrefix[prefix]!}`
}

export const parseNode = <kind extends NodeKind>(
	id: string,
	kind: kind,
	schema: NormalizedSchema<kind>,
	$: RawRootScope,
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
	const inner: Record<string, unknown> = {}
	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const schemaEntries = entriesOf(ctx.schema as Dict).sort(([lKey], [rKey]) =>
		isNodeKind(lKey) ?
			isNodeKind(rKey) ? precedenceOfKind(lKey) - precedenceOfKind(rKey)
			:	1
		: isNodeKind(rKey) ? -1
		: lKey < rKey ? -1
		: 1
	)
	const children: BaseNode[] = []
	for (const entry of schemaEntries) {
		const k = entry[0]
		const keyImpl = impl.keys[k]
		if (!keyImpl)
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)

		const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
		if (v !== unset && (v !== undefined || keyImpl.preserveUndefined))
			inner[k] = v
	}
	const entries = entriesOf(inner)

	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	entries.forEach(([k, v]) => {
		const keyImpl = impl.keys[k]
		const serialize =
			keyImpl.serialize ??
			(keyImpl.child ? serializeListableChild : defaultValueSerializer)

		json[k] = serialize(v as never)

		if (keyImpl.child) {
			const listableNode = v as listable<BaseNode>
			if (isArray(listableNode)) children.push(...listableNode)
			else children.push(listableNode)
		}
		if (!keyImpl.meta) typeJson[k] = json[k]
	})

	if (impl.finalizeJson) {
		json = impl.finalizeJson(json) as never
		typeJson = impl.finalizeJson(typeJson) as never
	}

	let collapsibleJson = json

	const collapsibleKeys = Object.keys(collapsibleJson)
	if (
		collapsibleKeys.length === 1 &&
		collapsibleKeys[0] === impl.collapsibleKey
	) {
		collapsibleJson = collapsibleJson[impl.collapsibleKey] as never
		if (
			// if the collapsibleJson is still an object
			hasDomain(collapsibleJson, "object") &&
			// and the JSON did not include any implied keys
			Object.keys(json).length === 1
		) {
			// we can replace it with its collapsed value
			json = collapsibleJson
			typeJson = collapsibleJson
		}
	}

	const innerHash = JSON.stringify({ kind, ...json })
	if (ctx.reduceTo) {
		nodeCache[innerHash] = ctx.reduceTo
		return ctx.reduceTo
	}

	const typeHash = JSON.stringify({ kind, ...typeJson })

	if (impl.reduce && !ctx.prereduced) {
		const reduced = impl.reduce(inner, ctx.$)
		if (reduced) {
			if (reduced instanceof Disjoint) return reduced.throw()

			// if we're defining the resolution of an alias and the result is
			// reduced to another node, add the alias to that node if it doesn't
			// already have one.
			if (ctx.alias) reduced.alias ??= ctx.alias

			// we can't cache this reduction for now in case the reduction involved
			// impliedSiblings
			return reduced
		}
	}

	// we have to wait until after reduction to return a cached entry,
	// since reduction can add impliedSiblings
	if (nodeCache[innerHash]) return nodeCache[innerHash]

	const attachments: UnknownAttachments & dict = {
		id: ctx.id,
		kind,
		impl,
		inner,
		entries,
		json: json as Json,
		typeJson: typeJson as Json,
		collapsibleJson: collapsibleJson as JsonData,
		children,
		innerHash,
		typeHash
	}
	if (ctx.alias) attachments.alias = ctx.alias

	for (const k in inner) {
		if (k !== "description" && k !== "in" && k !== "out")
			attachments[k] = inner[k]
	}

	const node: BaseNode = new nodeClassesByKind[kind](
		attachments as never,
		ctx.$
	)

	return (nodeCache[innerHash] = node)
}
