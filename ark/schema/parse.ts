import {
	entriesOf,
	hasDomain,
	includes,
	throwParseError,
	type Json,
	type JsonData,
	type PartialRecord,
	type extend
} from "@arktype/util"
import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import type { ScopeNode } from "./scope.js"
import type { BaseNodeDeclaration } from "./shared/declare.js"
import {
	defaultValueSerializer,
	typeKinds,
	type BasisKind,
	type NodeKind,
	type NodeParserImplementation
} from "./shared/define.js"
import type { Attachments, Schema, reducibleKindOf } from "./shared/nodes.js"
import { BaseType } from "./type.js"

export type SchemaParseOptions = {
	alias?: string
	prereduced?: true
	/** Instead of creating the node, compute the innerId of the definition and
	 * point it to the specified resolution.
	 *
	 * Useful for defining reductions like number|string|bigint|symbol|object|true|false|null|undefined => unknown
	 **/
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

export declare function parse<defKind extends NodeKind>(
	kind: defKind,
	def: Schema<defKind>,
	ctx: SchemaParseContext
): Node<reducibleKindOf<defKind>>

type UnknownNodeConstructor<kind extends NodeKind> = new (
	baseAttachments: BaseAttachments
) => Node<kind>

const instantiateAttachments = <kind extends NodeKind>(
	baseAttachments: BaseAttachments
) => {
	const ctor: UnknownNodeConstructor<kind> = includes(
		typeKinds,
		baseAttachments.kind
	)
		? BaseType
		: (BaseNode as any)
	return new ctor(baseAttachments)
}

export const composeParser = <d extends BaseNodeDeclaration>(
	impl: NodeParserImplementation<d>
) => {
	return (
		def: d["schema"],
		ctx: SchemaParseContext
		// TODO: Build into declaration
	): Attachments<d["kind"]> => {
		if (def instanceof BaseNode) {
			return def.kind === impl.kind
				? (def as never)
				: throwParseError(
						`Node of kind ${def.kind} is not valid as a ${impl.kind} definition`
				  )
		}
		const normalizedDefinition: any = impl.normalize?.(def) ?? def
		const inner: Record<string, unknown> = {}
		const meta: Record<string, unknown> = {}
		impl.addContext?.(ctx)
		const schemaEntries = entriesOf(normalizedDefinition).sort((l, r) =>
			l[0] < r[0] ? -1 : 1
		)
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: BaseNode[] = []
		for (const entry of schemaEntries) {
			const k = entry[0]
			const keyImpl = impl.keys[k]
			if (!keyImpl) {
				return throwParseError(`Key ${k} is not valid on ${impl.kind} schema`)
			}
			const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
			if (v === undefined && !keyImpl.preserveUndefined) {
				continue
			}
			inner[k] = v
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
			if (k in impl.keys) {
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
			return (globalResolutions[innerId] = ctx.reduceTo) as never
		}
		const typeId = JSON.stringify({ kind, ...typeJson })
		if (innerId in globalResolutions) {
			return globalResolutions[innerId] as never
		}
		if (impl.reduce && !ctx.prereduced) {
			const reduced = impl.reduce(inner, ctx.scope)
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
		const prefix = ctx.alias ?? impl.kind
		typeCountsByPrefix[prefix] ??= 0
		const id = `${prefix}${++typeCountsByPrefix[prefix]!}`
		const attachments = {
			id,
			alias: ctx.alias,
			kind: impl.kind,
			inner,
			meta,
			entries,
			json: json as Json,
			typeJson: typeJson as Json,
			collapsibleJson: collapsibleJson as JsonData,
			children,
			innerId,
			typeId,
			scope: ctx.scope
		} satisfies BaseAttachments
		for (const k in inner) {
			if (k !== "in" && k !== "out") {
				attachments[k] = attachments[k] as never
			}
		}
		return attachments as {} as Attachments<d["kind"]>
		// Object.assign(attachments, impl.attach(attachments as never))
		// return (globalResolutions[innerId] = instantiateAttachments(attachments))
	}
}
