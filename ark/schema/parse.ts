import {
	entriesOf,
	hasDomain,
	includes,
	isArray,
	stringify,
	throwParseError,
	type Json
} from "@arktype/util"
import { maybeGetBasisKind } from "./bases/basis.js"
import { BaseNode, type UnknownNode } from "./node.js"
import type {
	UnionSchema,
	parseSchemaBranches,
	validateSchemaBranch
} from "./sets/union.js"
import {
	defaultInnerKeySerializer,
	refinementKinds,
	type NodeKind,
	type SchemaParseContext,
	type SchemaParseContextInput,
	type TypeKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import {
	NodeImplementationByKind,
	type Inner,
	type Node,
	type Schema,
	type childKindOf,
	type reducibleKindOf
} from "./shared/node.js"
import { isNode } from "./shared/registry.js"
import { BaseType } from "./type.js"

export type validateScopeSchema<def, $> = {
	[k in keyof def]: {}
}
export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly entries: entriesOf<Inner<kind>>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: Node<childKindOf<kind>>[]
	readonly id: string
	readonly typeId: string
}

export type NodeParser = {
	<const branches extends readonly unknown[]>(
		schema: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i]>
			}
		} & UnionSchema
	): parseSchemaBranches<branches>
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
}

const parseBranches: NodeParser = (...branches) =>
	parseSchema(
		"union",
		(branches.length === 1 &&
		hasDomain(branches[0], "object") &&
		"branches" in branches[0]
			? branches[0]
			: branches) as never
	) as never

type UnitsParser = <const branches extends readonly unknown[]>(
	...values: branches
) => branches["length"] extends 1
	? Node<"unit", branches[0]>
	: Node<"union" | "unit", branches[number]>

const parseUnits: UnitsParser = (...values) => {
	const uniqueValues: unknown[] = []
	for (const value of values) {
		if (!uniqueValues.includes(value)) {
			uniqueValues.push(value)
		}
	}
	const branches = uniqueValues.map((unit) =>
		parsePrereduced("unit", { is: unit })
	)
	if (branches.length === 1) {
		return branches[0]
	}
	return parsePrereduced("union", {
		branches
	}) as never
}

export const node = Object.assign(parseBranches, {
	units: parseUnits
})

export function parsePrereduced<kind extends TypeKind>(
	kind: kind,
	schema: Schema<kind>
): Node<kind> {
	return parseSchema(kind, schema, {
		prereduced: true
	}) as never
}

export function parseTypeFromKinds<schemaKind extends TypeKind>(
	allowedKinds: readonly schemaKind[],
	schema: unknown
): Node<reducibleKindOf<schemaKind>> {
	const kind = kindOfTypeSchema(schema)
	if (!allowedKinds.includes(kind as never)) {
		return throwParseError(
			`Schema of kind ${kind} should be one of ${allowedKinds}`
		)
	}
	return parseSchema(kind, schema as never, {}) as never
}

const nodeCache: Record<string, unknown> = {}

export function parseSchema<schemaKind extends NodeKind>(
	kind: schemaKind,
	schema: Schema<schemaKind>,
	ctxInput?: SchemaParseContextInput
): Node<reducibleKindOf<schemaKind>> {
	if (isNode(schema)) {
		return schema as never
	}
	const implementation: UnknownNodeImplementation = NodeImplementationByKind[
		kind
	] as never
	const inner: Record<string, unknown> = {}
	const normalizedSchema: any = implementation.normalize?.(schema) ?? schema
	const ctx: SchemaParseContext<any> = {
		...ctxInput,
		schema: normalizedSchema,
		cls: BaseNode
	}
	implementation.addContext?.(ctx)
	const schemaEntries = entriesOf(normalizedSchema).sort((l, r) =>
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
		if (isNode(innerValue)) {
			json[k] = innerValue.collapsibleJson
			children.push(innerValue)
		} else if (
			isArray(innerValue) &&
			innerValue.every((_): _ is UnknownNode => isNode(_))
		) {
			json[k] = innerValue.map((node) => node.collapsibleJson)
			children.push(...innerValue)
		} else {
			json[k] = keyDefinition.serialize
				? keyDefinition.serialize(v)
				: defaultInnerKeySerializer(v)
		}
		if (!keyDefinition.meta) {
			typeJson[k] = json[k]
		}
	}
	if (!ctx.prereduced) {
		if (implementation.reduce) {
			const reduced = implementation.reduce(inner, ctx)
			if (reduced) {
				return reduced as never
			}
		}
	}
	const innerEntries = entriesOf(inner)
	let collapsibleJson = json
	if (
		innerEntries.length === 1 &&
		innerEntries[0][0] === implementation.collapseKey
	) {
		collapsibleJson = json[implementation.collapseKey] as never
		if (hasDomain(collapsibleJson, "object")) {
			json = collapsibleJson
			typeJson = collapsibleJson
		}
	}
	const id = kind + JSON.stringify(json)
	if (id in nodeCache) {
		return nodeCache[id] as never
	}
	const typeId = kind + JSON.stringify(typeJson)
	if (
		BaseNode.isInitialized &&
		BaseNode.builtins.unknownUnion.typeId === typeId
	) {
		return BaseNode.builtins.unknown as never
	}
	const attachments = {
		kind,
		inner,
		entries: innerEntries,
		json,
		typeJson,
		collapsibleJson,
		children,
		id,
		typeId
	} satisfies Record<keyof BaseAttachments<any>, unknown>
	return includes(refinementKinds, kind)
		? new (BaseNode as any)(attachments)
		: new (BaseType as any)(attachments)
}

function kindOfTypeSchema(schema: unknown): TypeKind {
	const basisKind = maybeGetBasisKind(schema)
	if (basisKind) {
		return basisKind
	}
	if (typeof schema === "object" && schema !== null) {
		if (schema instanceof BaseNode) {
			if (schema.isType()) {
				return schema.kind
			}
			// otherwise, error at end of function
		} else if ("morph" in schema) {
			return "morph"
		} else if ("branches" in schema || isArray(schema)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${stringify(schema)} is not a valid type schema`)
}
