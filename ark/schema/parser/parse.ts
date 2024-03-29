import type { SchemaParseOptions } from "@arktype/schema"
import {
	entriesOf,
	hasDomain,
	isArray,
	printable,
	throwParseError,
	type Json,
	type JsonData,
	type PartialRecord,
	type evaluate,
	type listable,
	type valueOf
} from "@arktype/util"
import type {
	BaseAttachments,
	Node,
	TypeNode,
	TypeSchema,
	UnknownNode
} from "../base.js"
import type { Schema, reducibleKindOf } from "../kinds.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	defaultValueSerializer,
	discriminatingIntersectionKeys,
	isNodeKind,
	precedenceOfKind,
	type KeyDefinitions,
	type NodeKind,
	type TypeKind,
	type UnknownNodeImplementation
} from "../shared/implement.js"
import { hasArkKind } from "../shared/utils.js"
import type { ArkConfig, Space } from "../space.js"
import type { UnionNode } from "../types/union.js"
import type { UnitNode } from "../types/unit.js"
import type {
	NodeParser,
	RootParser,
	SchemaParser,
	UnitsParser
} from "./inference.js"

export type SchemaParseOptions = {
	alias?: string
	prereduced?: boolean
	config?: ArkConfig
	space?: Space
	// TODO: check if reduceTo works across scopes
	/** Instead of creating the node, compute the innerId of the definition and
	 * point it to the specified resolution.
	 *
	 * Useful for defining reductions like number|string|bigint|symbol|object|true|false|null|undefined => unknown
	 **/
	reduceTo?: Node
	root?: boolean
	allowedKinds?: readonly NodeKind[]
}

export type SchemaParseContext = evaluate<
	SchemaParseOptions & {
		raw: unknown
	}
>

const typeCountsByPrefix: PartialRecord<string, number> = {}

const baseKeys: PartialRecord<string, valueOf<KeyDefinitions<any>>> = {
	description: { meta: true }
} satisfies KeyDefinitions<BaseNodeDeclaration> as never

export const schemaKindOf = <kind extends TypeKind = TypeKind>(
	schema: unknown,
	allowedKinds?: readonly kind[]
): kind => {
	const kind = discriminateSchemaKind(schema)
	if (allowedKinds && !allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Schema of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return kind as never
}

const discriminateSchemaKind = (schema: unknown): TypeKind => {
	switch (typeof schema) {
		case "string":
			return "domain"
		case "function":
			return hasArkKind(schema, "node")
				? schema.isType()
					? schema.kind
					: throwParseError(
							`${schema.kind} constraint ${schema.expression} cannot be used as a root type`
					  )
				: "proto"
		case "object":
			// throw at end of function
			if (schema === null) break

			if ("morphs" in schema) return "morph"

			if ("branches" in schema || isArray(schema)) return "union"

			if ("unit" in schema) return "unit"

			const schemaKeys = Object.keys(schema)

			if (
				schemaKeys.length === 0 ||
				schemaKeys.some((k) => k in discriminatingIntersectionKeys)
			)
				return "intersection"
			if ("proto" in schema) return "proto"
			if ("domain" in schema) return "domain"
	}
	return throwParseError(`${printable(schema)} is not a valid type schema`)
}

export const schema: SchemaParser<{}> = (schema) => schema

export const root: RootParser<{}> = (schema, opts) =>
	node(schemaKindOf(schema), schema, opts) as never

export const units: UnitsParser = (...values) => {}

export const parseUnits = (
	values: unknown[],
	ctx: SchemaParseContext
): UnionNode | UnitNode => {
	const uniqueValues: unknown[] = []
	for (const value of values) {
		if (!uniqueValues.includes(value)) {
			uniqueValues.push(value)
		}
	}
	const branches = uniqueValues.map((unit) => parseNode("unit", { unit }, ctx))
	if (branches.length === 1) {
		return branches[0] as never
	}
	return parseNode("union", branches, { ...ctx, prereduced: true }) as never
}

export const node: NodeParser<{}> = (kind, schema: unknown, opts) =>
	parseNode(kind, schema as never, {
		prereduced: opts?.prereduced ?? false,
		raw: schema,
		$: {},
		...opts
	})

const nodeCache: Record<string, Node | undefined> = {}

export function parseNode<kind extends NodeKind>(
	kind: kind,
	schema: Schema<kind>,
	ctx: SchemaParseContext
): Node<reducibleKindOf<kind>>
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function parseNode(
	kind: NodeKind,
	schema: unknown,
	ctx: SchemaParseContext
): UnknownNode {
	if (hasArkKind(schema, "node") && schema.kind === kind) {
		return schema as never
	}
	if (kind === "union" && hasDomain(schema, "object")) {
		if (isArray(schema) && schema.length === 1) {
			return parseNode(schemaKindOf(schema), schema[0] as never, ctx)
		} else if (
			"branches" in schema &&
			isArray(schema.branches) &&
			schema.branches.length === 1
		) {
			return parseNode(schemaKindOf(schema), schema.branches[0] as never, ctx)
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
	if (ctx.reduceTo) {
		return (nodeCache[innerId] = ctx.reduceTo)
	}

	const typeId = JSON.stringify({ kind, ...typeJson })

	if (impl.reduce && !ctx.prereduced) {
		const reduced = impl.reduce(inner)
		if (reduced) {
			if (reduced instanceof Disjoint) return reduced.throw()

			// if we're defining the resolution of an alias and the result is
			// reduced to another node, add the alias to that node if it doesn't
			// already have one.
			if (ctx.alias) {
				reduced.alias ??= ctx.alias
			}
			// we can't cache this reduction for now in case the reduction involved
			// impliedSiblings
			return reduced
		}
	}

	// we have to wait until after reduction to return a cached entry,
	// since reduction can add impliedSiblings
	if (nodeCache[innerId]) return nodeCache[innerId]

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
		typeId
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
	return (nodeCache[innerId] = new cls(attachments as never))
}

const throwMismatchedNodeSchemaError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)
