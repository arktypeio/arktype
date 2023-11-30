import {
	entriesOf,
	hasDomain,
	includes,
	throwParseError,
	type PartialRecord,
	type extend
} from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type UnknownNode
} from "./base.js"
import type { BaseResolutions, ScopeNode } from "./scope.js"
import {
	defaultInnerKeySerializer,
	typeKinds,
	type BasisKind,
	type NodeKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import {
	NodeImplementationByKind,
	type Schema,
	type reducibleKindOf
} from "./shared/nodes.js"
import { BaseType } from "./type.js"

export type SchemaParseOptions = {
	alias?: string
	prereduced?: true
	reduceTo?: Node
	basis?: Node<BasisKind> | undefined
}

export type SchemaParseContext = extend<
	SchemaParseOptions,
	{
		scope: ScopeNode
		definition: unknown
	}
>

const globalResolutions: Record<string, Node> = {}
const typeCountsByPrefix: PartialRecord<string, number> = {}

export const parse = <defKind extends NodeKind>(
	kind: defKind,
	def: Schema<defKind>,
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
	if (ctx.reduceTo) {
		return (globalResolutions[innerId] = ctx.reduceTo) as never
	}
	const typeId = JSON.stringify({ kind, ...typeJson })
	if (innerId in globalResolutions) {
		return globalResolutions[innerId] as never
	}
	if (implementation.reduce && !ctx.prereduced) {
		const reduced = implementation.reduce(inner, ctx.scope)
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
	const prefix = ctx.alias ?? kind
	typeCountsByPrefix[prefix] ??= 0
	const id = `${prefix}${++typeCountsByPrefix[prefix]!}`
	const baseAttachments = {
		id,
		alias: ctx.alias,
		kind,
		inner,
		entries,
		json,
		typeJson,
		collapsibleJson,
		children,
		innerId,
		typeId,
		scope: ctx.scope
	} satisfies UnknownAttachments as BaseAttachments<reducibleKindOf<defKind>>
	return (globalResolutions[innerId] = instantiateAttachments(baseAttachments))
}

type UnknownAttachments = Record<keyof BaseAttachments<"union">, any>

type UnknownNodeConstructor<kind extends NodeKind> = new (
	baseAttachments: BaseAttachments<kind>
) => Node<kind>

const instantiateAttachments = <kind extends NodeKind>(
	baseAttachments: BaseAttachments<kind>
) => {
	const ctor: UnknownNodeConstructor<kind> = includes(
		typeKinds,
		baseAttachments.kind
	)
		? BaseType
		: (BaseNode as any)
	return new ctor(baseAttachments)
}
