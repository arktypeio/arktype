import {
	entriesOf,
	hasDomain,
	isArray,
	printable,
	throwParseError,
	unset,
	type Json,
	type JsonData,
	type listable
} from "@arktype/util"
import { nodeImplementationsByKind, type NormalizedSchema } from "./kinds.js"
import type { BaseNode } from "./node.js"
import type { UnknownRoot } from "./roots/root.js"
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
}

export interface NodeParseContext<kind extends NodeKind = NodeKind>
	extends NodeParseOptions {
	$: RawRootScope
	id: string
	args?: Record<string, UnknownRoot>
	schema: NormalizedSchema<kind>
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
	switch (typeof schema) {
		case "string":
			return schema[0] === "$" ? "alias" : "domain"
		case "function":
			return hasArkKind(schema, "root") ? schema.kind : "proto"
		case "object": {
			// throw at end of function
			if (schema === null) break

			if ("morphs" in schema) return "morph"

			if ("branches" in schema || isArray(schema)) return "union"

			if ("unit" in schema) return "unit"

			if ("alias" in schema) return "alias"

			const schemaKeys = Object.keys(schema)

			if (schemaKeys.length === 0 || schemaKeys.some(k => k in constraintKeys))
				return "intersection"
			if ("proto" in schema) return "proto"
			if ("domain" in schema) return "domain"
		}
	}
	return throwParseError(`${printable(schema)} is not a valid type schema`)
}

const attachmentsCache: { [innerHash: string]: UnknownAttachments } = {}

const serializeListableChild = (listableNode: listable<BaseNode>) =>
	isArray(listableNode) ?
		listableNode.map(node => node.collapsibleJson)
	:	listableNode.collapsibleJson

export const parseNode = (
	kind: NodeKind,
	ctx: NodeParseContext
): UnknownAttachments => {
	const impl = nodeImplementationsByKind[kind]
	const inner: Record<string, unknown> = {}
	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const schemaEntries = Object.entries(ctx.schema).sort(([lKey], [rKey]) =>
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
			if (isArray(listableNode)) {
				inner[k] = listableNode.map(n => {
					const scoped = n.bindScope(ctx.$)
					children.push(scoped)
					return scoped
				})
			} else {
				const scoped = listableNode.bindScope(ctx.$)
				children.push(scoped)
				inner[k] = scoped
			}
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
		attachmentsCache[innerHash] = ctx.reduceTo
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
			return reduced.attachments
		}
	}

	// we have to wait until after reduction to return a cached entry,
	// since reduction can add impliedSiblings
	if (attachmentsCache[innerHash]) return attachmentsCache[innerHash]

	const attachments = {
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
	} satisfies UnknownAttachments as Record<string, any>
	if (ctx.alias) attachments.alias = ctx.alias

	for (const k in inner) {
		if (k !== "description" && k !== "in" && k !== "out")
			attachments[k] = inner[k]
	}

	return (attachmentsCache[innerHash] = attachments as never)
}
