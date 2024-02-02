import {
	entriesOf,
	hasDomain,
	throwParseError,
	type Json,
	type JsonData,
	type PartialRecord,
	type and,
	type valueOf
} from "@arktype/util"
import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import { nodesByKind, type Schema, type reducibleKindOf } from "./kinds.js"
import type { ScopeNode } from "./scope.js"
import type { BaseNodeDeclaration } from "./shared/declare.js"
import {
	defaultValueSerializer,
	type BasisKind,
	type KeyDefinitions,
	type NodeKind,
	type UnknownNodeImplementation
} from "./shared/implement.js"

export type SchemaParseOptions = {
	alias?: string
	prereduced?: true
	// TODO: check if reduceTo works across scopes
	/** Instead of creating the node, compute the innerId of the definition and
	 * point it to the specified resolution.
	 *
	 * Useful for defining reductions like number|string|bigint|symbol|object|true|false|null|undefined => unknown
	 **/
	reduceTo?: Node
	basis?: Node<BasisKind> | undefined
}

export type SchemaParseContext = and<
	SchemaParseOptions,
	{
		$: ScopeNode
		definition: unknown
	}
>

const typeCountsByPrefix: PartialRecord<string, number> = {}

const baseKeys: PartialRecord<string, valueOf<KeyDefinitions<any>>> = {
	description: { meta: true }
} satisfies KeyDefinitions<BaseNodeDeclaration> as never

export function parse<defKind extends NodeKind>(
	kind: defKind,
	schema: Schema<defKind>,
	ctx: SchemaParseContext
): Node<reducibleKindOf<defKind>>
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function parse(
	kind: NodeKind,
	schema: unknown,
	ctx: SchemaParseContext
): Node {
	const cls = nodesByKind[kind]
	const impl: UnknownNodeImplementation = cls.implementation as never
	if (schema instanceof BaseNode) {
		return schema.kind === kind
			? (schema as never)
			: throwMismatchedNodeSchemaError(kind, schema.kind)
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
	impl.addParseContext?.(ctx)
	const schemaEntries = entriesOf(normalizedDefinition).sort((l, r) =>
		l[0] < r[0] ? -1 : 1
	)
	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	const children: Node[] = []
	for (const entry of schemaEntries) {
		const k = entry[0]
		const keyImpl =
			(impl.keys as PartialRecord<string, valueOf<KeyDefinitions<any>>>)[k] ??
			baseKeys[k]
		if (!keyImpl) {
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)
		}
		const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
		if (v === undefined && !keyImpl.preserveUndefined) {
			continue
		}

		if (keyImpl.child) {
			if (Array.isArray(v)) {
				json[k] = v.map((node) => node.collapsibleJson)
				children.push(...v)
			} else {
				json[k] = v.collapsibleJson
				children.push(v)
			}
		} else {
			json[k] = keyImpl.serialize
				? keyImpl.serialize(v)
				: defaultValueSerializer(v)
		}
		inner[k] = v
		if (!keyImpl.meta) {
			typeJson[k] = json[k]
		}
	}
	const entries = entriesOf(inner)
	let collapsibleJson = json
	if (entries.length === 1 && entries[0][0] === impl.collapseKey) {
		collapsibleJson = json[impl.collapseKey] as never
		if (hasDomain(collapsibleJson, "object")) {
			json = collapsibleJson
			typeJson = collapsibleJson
		}
	}
	const innerId = JSON.stringify({ kind, ...json })
	if (ctx.reduceTo) {
		return (ctx.$.nodeCache[innerId] = ctx.reduceTo)
	}
	const typeId = JSON.stringify({ kind, ...typeJson })
	if (innerId in ctx.$.nodeCache) {
		return ctx.$.nodeCache[innerId]
	}
	if (impl.reduce && !ctx.prereduced) {
		const reduced = impl.reduce(inner, ctx.$)
		if (reduced) {
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
		if (k !== "in" && k !== "out") {
			attachments[k] = inner[k]
		}
	}
	return (ctx.$.nodeCache[innerId] = new cls(attachments as never))
}

const throwMismatchedNodeSchemaError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)
