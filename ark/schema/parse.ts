import {
	entriesOf,
	hasDomain,
	includes,
	throwParseError,
	type PartialRecord,
	type extend
} from "@arktype/util"
import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import type { ScopeNode } from "./scope.js"
import type { BaseNodeDeclaration } from "./shared/declare.js"
import {
	defaultInnerKeySerializer,
	typeKinds,
	type BasisKind,
	type MetaKeyDefinitions,
	type NodeImplementationInput,
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
	const children: BaseNode[] = []
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
	const attachments = {
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
	} satisfies BaseAttachments as Record<string, unknown>
	for (const k in inner) {
		if (k !== "in" && k !== "out") {
			attachments[k] = attachments[k] as never
		}
	}
	Object.assign(attachments, implementation.attach(attachments as never))
	return (globalResolutions[innerId] = instantiateAttachments(attachments))
}

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

type IncrementalAttachments = Pick<
	BaseAttachments,
	"children" | "inner" | "typeJson"
>

export const composeParser = <d extends BaseNodeDeclaration>(
	impl: NodeImplementationInput<d>
) => {
	const metaKeys: MetaKeyDefinitions<BaseNodeDeclaration> = {
		description: {}
	}
	return (
		def: d["schema"],
		ctx: SchemaParseContext
		// TODO: Build into declaration
	): Node<reducibleKindOf<d["kind"]>> => {
		if (def instanceof BaseNode) {
			return def.kind === impl.kind
				? (def as never)
				: throwParseError(
						`Node of kind ${def.kind} is not valid as a ${impl.kind} definition`
				  )
		}
		const normalizedDefinition: any = impl.normalize?.(def) ?? def
		const inner: Record<string, unknown> = {}
		impl.addContext?.(ctx)
		const schemaEntries = entriesOf(normalizedDefinition).sort((l, r) =>
			l[0] < r[0] ? -1 : 1
		)
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: BaseNode[] = []
		for (const [k, v] of schemaEntries) {
			const keyDefinition = impl.innerKeys[k] ?? metaKeys[k]
			if (!(k in impl.innerKeys)) {
				return throwParseError(`Key ${k} is not valid on ${impl.kind} schema`)
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
		const prefix = ctx.alias ?? kind
		typeCountsByPrefix[prefix] ??= 0
		const id = `${prefix}${++typeCountsByPrefix[prefix]!}`
		const attachments = {
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
		} satisfies BaseAttachments as Record<string, unknown>
		for (const k in inner) {
			if (k !== "in" && k !== "out") {
				attachments[k] = attachments[k] as never
			}
		}
		Object.assign(attachments, impl.attach(attachments as never))
		return (globalResolutions[innerId] = instantiateAttachments(attachments))
	}
}
