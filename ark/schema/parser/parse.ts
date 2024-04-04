import {
	type Json,
	type JsonData,
	type PartialRecord,
	type array,
	entriesOf,
	hasDomain,
	isArray,
	type listable,
	printable,
	type propValueOf,
	throwParseError
} from "@arktype/util"
import type { Node, Schema, UnknownAttachments, UnknownNode } from "../base.js"
import type { BaseScope } from "../scope.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	type KeyDefinitions,
	type NodeKind,
	type SchemaKind,
	type UnknownNodeImplementation,
	defaultValueSerializer,
	discriminatingIntersectionKeys,
	isNodeKind,
	precedenceOfKind
} from "../shared/implement.js"
import { hasArkKind } from "../shared/utils.js"

export type NodeParseOptions = {
	alias?: string
	prereduced?: boolean
	args?: Record<string, Schema>
	/** Instead of creating the node, compute the innerId of the definition and
	 * point it to the specified resolution.
	 *
	 * Useful for defining reductions like number|string|bigint|symbol|object|true|false|null|undefined => unknown
	 **/
	reduceTo?: Node
}

export interface NodeParseContext extends NodeParseOptions {
	$: BaseScope
	raw: unknown
}

const nodeCountsByPrefix: PartialRecord<string, number> = {}

const baseKeys: PartialRecord<string, propValueOf<KeyDefinitions<any>>> = {
	description: { meta: true }
} satisfies KeyDefinitions<BaseNodeDeclaration> as never

export const schemaKindOf = <kind extends SchemaKind = SchemaKind>(
	def: unknown,
	allowedKinds?: readonly kind[]
): kind => {
	const kind = discriminateSchemaKind(def)
	if (allowedKinds && !allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Schema of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return kind as never
}

const discriminateSchemaKind = (def: unknown): SchemaKind => {
	switch (typeof def) {
		case "string":
			return "domain"
		case "function":
			return hasArkKind(def, "node")
				? def.isType()
					? def.kind
					: throwParseError(
							`${def.kind} constraint ${def.expression} cannot be used as a root type`
						)
				: "proto"
		case "object": {
			// throw at end of function
			if (def === null) break

			if ("morphs" in def) return "morph"

			if ("branches" in def || isArray(def)) return "union"

			if ("unit" in def) return "unit"

			const schemaKeys = Object.keys(def)

			if (
				schemaKeys.length === 0 ||
				schemaKeys.some((k) => k in discriminatingIntersectionKeys)
			)
				return "intersection"
			if ("proto" in def) return "proto"
			if ("domain" in def) return "domain"
		}
	}
	return throwParseError(`${printable(def)} is not a valid type schema`)
}

// 	this.parse(
// 		"union",
// 		{
// 			branches: [
// 				"string",
// 				"number",
// 				"object",
// 				"bigint",
// 				"symbol",
// 				{ unit: true },
// 				{ unit: false },
// 				{ unit: null },
// 				{ unit: undefined }
// 			]
// 		},
// 		{ reduceTo: this.parsePrereduced("intersection", {}) }
// 	)

export const parseNode = (
	kinds: NodeKind | array<SchemaKind>,
	schema: unknown,
	$: BaseScope,
	opts?: NodeParseOptions
): Node => {
	const kind: NodeKind =
		typeof kinds === "string" ? kinds : schemaKindOf(schema, kinds)
	if (hasArkKind(schema, "node") && schema.kind === kind) {
		return schema
	}
	if (kind === "union" && hasDomain(schema, "object")) {
		const branches = schemaBranchesOf(schema)
		if (branches?.length === 1) {
			return parseNode(schemaKindOf(schema), branches as never, $, opts)
		}
	}
	const cls = $ark.nodeClassesByKind[kind]
	const impl: UnknownNodeImplementation = cls.implementation as never
	const normalizedDefinition: any = impl.normalize?.(schema) ?? schema
	// check again after normalization in case a node is a valid collapsed
	// schema for the kind (e.g. sequence can collapse to element accepting a Node)
	if (hasArkKind(normalizedDefinition, "node")) {
		return normalizedDefinition.kind === kind
			? (normalizedDefinition as never)
			: throwMismatchedNodeSchemaError(kind, normalizedDefinition.kind)
	}
	const ctx: NodeParseContext = { $, raw: schema, ...opts }
	const inner: Record<string, unknown> = {}
	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const schemaEntries = entriesOf(normalizedDefinition).sort(
		([lKey], [rKey]) =>
			isNodeKind(lKey)
				? isNodeKind(rKey)
					? precedenceOfKind(lKey) - precedenceOfKind(rKey)
					: 1
				: isNodeKind(rKey)
					? -1
					: lKey < rKey
						? -1
						: 1
	)
	const children: UnknownNode[] = []
	for (const entry of schemaEntries) {
		const k = entry[0]
		const keyImpl = impl.keys[k] ?? baseKeys[k]
		if (!keyImpl) {
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)
		}
		const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
		if (v !== undefined || keyImpl.preserveUndefined) {
			inner[k] = v
		}
	}
	const entries = entriesOf(inner)

	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	let collapsibleJson: Record<string, unknown> = {}
	entries.forEach(([k, v]) => {
		const keyImpl = impl.keys[k] ?? baseKeys[k]
		if (keyImpl.child) {
			const listableNode = v as listable<UnknownNode>
			if (isArray(listableNode)) {
				json[k] = listableNode.map((node) => node.collapsibleJson)
				children.push(...listableNode)
			} else {
				json[k] = listableNode.collapsibleJson
				children.push(listableNode)
			}
		} else {
			json[k] = keyImpl.serialize
				? keyImpl.serialize(v)
				: defaultValueSerializer(v)
		}

		if (!keyImpl.meta) {
			typeJson[k] = json[k]
		}
		if (!keyImpl.implied) {
			collapsibleJson[k] = json[k]
		}
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

	const innerId = JSON.stringify({ kind, ...json })
	if (opts?.reduceTo) {
		$.nodeCache[innerId] = opts.reduceTo
		return opts.reduceTo
	}

	const typeId = JSON.stringify({ kind, ...typeJson })

	if (impl.reduce && !opts?.prereduced) {
		const reduced = impl.reduce(inner, $)
		if (reduced) {
			if (reduced instanceof Disjoint) return reduced.throw()

			// if we're defining the resolution of an alias and the result is
			// reduced to another node, add the alias to that node if it doesn't
			// already have one.
			if (opts?.alias) {
				reduced.alias ??= opts.alias
			}
			// we can't cache this reduction for now in case the reduction involved
			// impliedSiblings
			return reduced
		}
	}

	// we have to wait until after reduction to return a cached entry,
	// since reduction can add impliedSiblings
	if ($.nodeCache[innerId]) return $.nodeCache[innerId]

	const prefix = opts?.alias ?? kind
	nodeCountsByPrefix[prefix] ??= 0
	const name = `${prefix}${++nodeCountsByPrefix[prefix]!}`
	const attachments = {
		name,
		kind,
		inner,
		entries,
		json: json as Json,
		typeJson: typeJson as Json,
		collapsibleJson: collapsibleJson as JsonData,
		children,
		innerId,
		typeId,
		$
	} satisfies Omit<UnknownAttachments, "description"> as Record<string, any>
	if (opts?.alias) {
		attachments.alias = opts.alias
	}
	for (const k in inner) {
		// avoid conflict with builtin cached getters
		if (k !== "in" && k !== "out") {
			attachments[k] = inner[k]
		}
	}
	// if (opts?.root) {
	// 	if (this.resolved) {
	// 		// this node was not part of the original scope, so compile an anonymous scope
	// 		// including only its references
	// 		this.bindCompiledScope(node.contributesReferences)
	// 	} else {
	// 		// we're still parsing the scope itself, so defer compilation but
	// 		// add the node as a reference
	// 		Object.assign(this.referencesByName, node.contributesReferencesByName)
	// 	}
	// }
	attachments.description ??= $.resolvedConfig[kind].description(attachments)
	const node = new cls(attachments as never)
	$.nodeCache[innerId] = node
	return node
}

const schemaBranchesOf = (schema: object) =>
	isArray(schema)
		? schema
		: "branches" in schema && isArray(schema.branches)
			? schema.branches
			: undefined

const throwMismatchedNodeSchemaError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)
