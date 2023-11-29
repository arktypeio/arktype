import {
	entriesOf,
	hasDomain,
	includes,
	throwParseError,
	type extend
} from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type UnknownNode
} from "./base.js"
import { SchemaNode } from "./schema.js"
import {
	defaultInnerKeySerializer,
	schemaKinds,
	type BasisKind,
	type NodeKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import {
	NodeImplementationByKind,
	type Definition,
	type reducibleKindOf
} from "./shared/nodes.js"
import { Space } from "./space.js"

export type SchemaParseOptions = {
	alias?: string
	prereduced?: true
	basis?: Node<BasisKind> | undefined
}

export type SchemaParseContext = extend<
	SchemaParseOptions,
	{
		id: string
		space: Space
		definition: unknown
	}
>

export const parse = <defKind extends NodeKind>(
	kind: defKind,
	def: Definition<defKind>,
	ctx: SchemaParseContext
): Node<reducibleKindOf<defKind>> => {
	if (def instanceof BaseNode) {
		return def.kind === kind
			? (def as never)
			: throwParseError(
					`Node of kind ${def.kind} is not valid as a ${kind} definition`
			  )
	}
	const implementation: UnknownNodeImplementation = NodeImplementationByKind[
		kind
	] as never
	const normalizedDefinition: any = implementation.normalize?.(def) ?? def
	const inner: Record<string, unknown> = {}
	implementation.addContext?.(ctx)
	const schemaEntries = entriesOf(normalizedDefinition).sort((l, r) =>
		l[0] < r[0] ? -1 : 1
	)
	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	const children: UnknownNode[] = []
	for (const [k, v] of schemaEntries) {
		const keyDefinition = implementation.keys[k]
		if (!(k in implementation.keys)) {
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)
		}
		const innerValue = keyDefinition.parse ? keyDefinition.parse(v, ctx) : v
		if (innerValue === undefined && !keyDefinition.preserveUndefined) {
			continue
		}
		inner[k] = innerValue
		if (keyDefinition.child) {
			if (Array.isArray(innerValue)) {
				json[k] = innerValue.map((node) => node.collapsibleJson)
				children.push(...innerValue)
			} else {
				json[k] = innerValue.collapsibleJson
				children.push(innerValue)
			}
		} else {
			json[k] = keyDefinition.serialize
				? keyDefinition.serialize(v)
				: defaultInnerKeySerializer(v)
		}
		if (!keyDefinition.meta) {
			typeJson[k] = json[k]
		}
	}
	const entries = entriesOf(inner)
	let collapsibleJson = json
	if (entries.length === 1 && entries[0][0] === implementation.collapseKey) {
		collapsibleJson = json[implementation.collapseKey] as never
		if (hasDomain(collapsibleJson, "object")) {
			json = collapsibleJson
			typeJson = collapsibleJson
		}
	}
	const innerId = JSON.stringify({ kind, ...json })
	const typeId = JSON.stringify({ kind, ...typeJson })
	if (ctx.space.cls.unknownUnion?.typeId === typeId) {
		return Space.keywords.unknown as never
	}
	if (implementation.reduce && !ctx.prereduced) {
		const reduced = implementation.reduce(inner, ctx.space)
		if (reduced) {
			// if we're defining the resolution of an alias and the result is
			// reduced to another node, add the alias to that node if it doesn't
			// already have one.
			if (ctx.alias) {
				reduced.alias ??= ctx.alias
			}
			return reduced as never
		}
	}
	const baseAttachments = {
		alias: ctx.alias,
		id: ctx.id,
		kind,
		inner,
		entries,
		json,
		typeJson,
		collapsibleJson,
		children,
		innerId,
		typeId,
		space: ctx.space
	} satisfies Record<keyof BaseAttachments<any>, unknown> as never
	return includes(schemaKinds, kind)
		? new SchemaNode(baseAttachments)
		: (new BaseNode(baseAttachments) as any)
}
