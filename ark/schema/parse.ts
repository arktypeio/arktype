import {
	entriesOf,
	hasDomain,
	isArray,
	isKeyOf,
	throwParseError,
	type Json,
	type JsonData,
	type PartialRecord,
	type evaluate,
	type listable,
	type valueOf
} from "@arktype/util"
import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import { nodesByKind, type Schema, type reducibleKindOf } from "./kinds.js"
import type { ScopeNode } from "./scope.js"
import type { BaseNodeDeclaration } from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import {
	defaultValueSerializer,
	precedenceOfKind,
	type KeyDefinitions,
	type NodeKind,
	type UnknownNodeImplementation
} from "./shared/implement.js"

export type SchemaParseOptions = {
	alias?: string
	prereduced?: boolean
	// TODO: check if reduceTo works across scopes
	/** Instead of creating the node, compute the innerId of the definition and
	 * point it to the specified resolution.
	 *
	 * Useful for defining reductions like number|string|bigint|symbol|object|true|false|null|undefined => unknown
	 **/
	reduceTo?: Node
}

export type SchemaParseContext = evaluate<
	SchemaParseOptions & {
		$: ScopeNode
		definition: unknown
	}
>

const typeCountsByPrefix: PartialRecord<string, number> = {}

const baseKeys: PartialRecord<string, valueOf<KeyDefinitions<any>>> = {
	description: { meta: true }
} satisfies KeyDefinitions<BaseNodeDeclaration> as never

export function parseAttachments<defKind extends NodeKind>(
	kind: defKind,
	schema: Schema<defKind>,
	ctx: SchemaParseContext
): Node<reducibleKindOf<defKind>>
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function parseAttachments(
	kind: NodeKind,
	schema: unknown,
	ctx: SchemaParseContext
): Node {
	const cls = nodesByKind[kind]
	const impl: UnknownNodeImplementation = cls.implementation as never
	if (schema instanceof BaseNode && schema.kind === kind) {
		return schema as never
	}
	const normalizedDefinition: any = impl.normalize?.(schema) ?? schema
	// check again after normalization in case a node is a valid collapsed
	// schema for the kind (e.g. sequence can collapse to element accepting a Node)
	if (normalizedDefinition instanceof BaseNode) {
		return normalizedDefinition.kind === kind
			? (normalizedDefinition as never)
			: throwMismatchedNodeSchemaError(kind, normalizedDefinition.kind)
	}
	const inner: Record<string, unknown> = {}
	// ensure node entries are parsed in order of precedence, with non-children
	// parsed first
	const schemaEntries = entriesOf(normalizedDefinition).sort(
		([lKey], [rKey]) =>
			isKeyOf(lKey, nodesByKind)
				? isKeyOf(rKey, nodesByKind)
					? precedenceOfKind(lKey) - precedenceOfKind(rKey)
					: 1
				: isKeyOf(rKey, nodesByKind)
				? -1
				: lKey < rKey
				? -1
				: 1
	)
	const children: Node[] = []
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
			const listableNode = v as listable<Node>
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
	if (collapsibleKeys.length === 1 && collapsibleKeys[0] === impl.collapseKey) {
		collapsibleJson = collapsibleJson[impl.collapseKey] as never
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
	if (ctx.reduceTo) {
		return (ctx.$.nodeCache[innerId] = ctx.reduceTo)
	}

	const typeId = JSON.stringify({ kind, ...typeJson })

	if (impl.reduce && !ctx.prereduced) {
		const reduced = impl.reduce(inner, ctx.$)
		if (reduced) {
			if (reduced instanceof Disjoint) return reduced.throw()

			// if we're defining the resolution of an alias and the result is
			// reduced to another node, add the alias to that node if it doesn't
			// already have one.
			if (ctx.alias) {
				reduced.alias ??= ctx.alias
			}
			// if we get a reduced node back, it will already have its own cache
			// entry however, we also point the unreduced id to that node so we
			// can bypass that reduction in the future
			return (ctx.$.nodeCache[innerId] = reduced)
		}
	}

	// we have to wait until after reduction to return a cached entry,
	// since reduction can add impliedSiblings
	if (innerId in ctx.$.nodeCache) {
		return ctx.$.nodeCache[innerId]
	}

	const prefix = ctx.alias ?? kind
	typeCountsByPrefix[prefix] ??= 0
	const name = `${prefix}${++typeCountsByPrefix[prefix]!}`
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
		$: ctx.$
	} satisfies BaseAttachments as Record<string, any>
	if (ctx.alias) {
		attachments.alias = ctx.alias
	}
	for (const k in inner) {
		// avoid conflict with builtin cached getters
		if (k !== "description" && k !== "in" && k !== "out") {
			attachments[k] = inner[k]
		}
	}
	return (ctx.$.nodeCache[innerId] = new cls(attachments as never))
}

const throwMismatchedNodeSchemaError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)
