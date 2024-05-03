import {
	type Dict,
	type Json,
	type JsonData,
	type PartialRecord,
	entriesOf,
	hasDomain,
	isArray,
	type listable,
	printable,
	type propValueOf,
	throwParseError
} from "@arktype/util"
import {
	type NormalizedDef,
	nodeClassesByKind,
	nodeImplementationsByKind
} from "./kinds.js"
import type { BaseNode } from "./node.js"
import type { UnknownRoot } from "./roots/root.js"
import type { RawRootScope } from "./scope.js"
import type { RawNodeDeclaration } from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import {
	type KeyDefinitions,
	type NodeKind,
	type RootKind,
	type UnknownAttachments,
	defaultValueSerializer,
	discriminatingIntersectionKeys,
	isNodeKind,
	precedenceOfKind
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
	def: NormalizedDef<kind>
}

const baseKeys: PartialRecord<string, propValueOf<KeyDefinitions<any>>> = {
	description: { meta: true }
} satisfies KeyDefinitions<RawNodeDeclaration> as never

export const schemaKindOf = <kind extends RootKind = RootKind>(
	def: unknown,
	allowedKinds?: readonly kind[]
): kind => {
	const kind = discriminateRootKind(def)
	if (allowedKinds && !allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Root of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return kind as never
}

const discriminateRootKind = (def: unknown): RootKind => {
	switch (typeof def) {
		case "string":
			return def[0] === "$" ? "alias" : "domain"
		case "function":
			return hasArkKind(def, "schema") ? def.kind : "proto"
		case "object": {
			// throw at end of function
			if (def === null) break

			if ("morphs" in def) return "morph"

			if ("branches" in def || isArray(def)) return "union"

			if ("unit" in def) return "unit"

			if ("alias" in def) return "alias"

			const schemaKeys = Object.keys(def)

			if (
				schemaKeys.length === 0 ||
				schemaKeys.some(k => k in discriminatingIntersectionKeys)
			)
				return "intersection"
			if ("proto" in def) return "proto"
			if ("domain" in def) return "domain"
		}
	}
	return throwParseError(`${printable(def)} is not a valid type schema`)
}

const nodeCache: { [innerHash: string]: BaseNode } = {}

export const parseNode = (kind: NodeKind, ctx: NodeParseContext): BaseNode => {
	const impl = nodeImplementationsByKind[kind]
	const inner: Record<string, unknown> = {}
	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const schemaEntries = entriesOf(ctx.def as Dict).sort(([lKey], [rKey]) =>
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
		const keyImpl = impl.keys[k] ?? baseKeys[k]
		if (!keyImpl)
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)

		const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
		if (v !== undefined || keyImpl.preserveUndefined) inner[k] = v
	}
	const entries = entriesOf(inner)

	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	let collapsibleJson: Record<string, unknown> = {}
	entries.forEach(([k, v]) => {
		const keyImpl = impl.keys[k] ?? baseKeys[k]
		if (keyImpl.child) {
			const listableNode = v as listable<BaseNode>
			if (isArray(listableNode)) {
				json[k] = listableNode.map(node => node.collapsibleJson)
				children.push(...listableNode)
			} else {
				json[k] = listableNode.collapsibleJson
				children.push(listableNode)
			}
		} else {
			json[k] =
				keyImpl.serialize ? keyImpl.serialize(v) : defaultValueSerializer(v)
		}

		if (!keyImpl.meta) typeJson[k] = json[k]

		if (!keyImpl.implied) collapsibleJson[k] = json[k]
	})

	// check keys on collapsibleJson instead of schema in case one or more keys is
	// implied, e.g. minVariadicLength on a SequenceNode
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
		typeHash,
		$: ctx.$
	} satisfies UnknownAttachments as Record<string, any>
	if (ctx.alias) attachments.alias = ctx.alias

	for (const k in inner) if (k !== "description") attachments[k] = inner[k]

	const node: BaseNode = new nodeClassesByKind[kind](attachments as never)

	nodeCache[innerHash] = node
	return node
}
