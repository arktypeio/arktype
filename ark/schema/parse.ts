import {
	entriesOf,
	hasDomain,
	isArray,
	throwParseError,
	type Json,
	type conform
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.ts"
import type { ConstraintKind } from "./constraints/constraint.ts"
import { compileSerializedValue } from "./io/compile.ts"
import { isNode } from "./io/registry.ts"
import type { UnknownNode } from "./node.ts"
import { rootKindOfSchema, type reducibleKindOf } from "./root.ts"
import type {
	NodeKind,
	RootKind,
	UnknownNodeImplementation
} from "./shared/define.ts"
import {
	NodeImplementationByKind,
	type Inner,
	type Node,
	type Schema
} from "./shared/node.ts"

export type BaseAttachments<kind extends NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly entries: entriesOf<Inner<kind>>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: UnknownNode[]
	readonly id: string
	readonly typeId: string
}

export function parseConstraint<kind extends ConstraintKind>(
	kind: kind,
	schema: Schema<kind>,
	basis: Node<BasisKind> | undefined
): Node<kind> {
	return parseSchema(kind, schema) as never
}

export type SchemaParseContext = {
	basis?: Node<BasisKind>
	prereduced?: true
}

export function parseSchema<schemaKind extends NodeKind>(
	allowedKinds: schemaKind | readonly conform<schemaKind, RootKind>[],
	schema: Schema<schemaKind>,
	ctx = {} as SchemaParseContext
): Node<reducibleKindOf<schemaKind>> {
	const kind =
		typeof allowedKinds === "string" ? allowedKinds : rootKindOfSchema(schema)
	if (isArray(allowedKinds) && !allowedKinds.includes(kind as never)) {
		return throwParseError(`Schema of kind ${kind} should be ${allowedKinds}`)
	}
	if (isNode(schema)) {
		return schema as never
	}
	const implementation: UnknownNodeImplementation = NodeImplementationByKind[
		kind
	] as never
	const normalizedSchema: any = implementation.normalize?.(schema) ?? schema
	const childContext =
		implementation.updateContext?.(normalizedSchema, ctx) ?? ctx
	const schemaEntries = entriesOf(normalizedSchema)
	const inner: Record<string, unknown> = {}
	let json: Record<string, unknown> = {}
	let typeJson: Record<string, unknown> = {}
	const children: UnknownNode[] = []
	for (const [k, v] of schemaEntries) {
		const keyDefinition = implementation.keys[k]
		if (!(k in implementation.keys)) {
			return throwParseError(`Key ${k} is not valid on ${kind} schema`)
		}
		const innerValue = keyDefinition.parse
			? keyDefinition.parse(v, childContext)
			: v
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
			json[k] = defaultValueSerializer(v)
		}
		if (!keyDefinition.meta) {
			typeJson[k] = json[k]
		}
	}
	for (const k of implementation.defaultableKeys) {
		if (inner[k] === undefined) {
			const defaultableDefinition = implementation.keys[k]
			inner[k] = defaultableDefinition.parse!(undefined, childContext)
			json[k] = defaultValueSerializer(inner[k])
			if (!defaultableDefinition.meta) {
				typeJson[k] = json[k]
			}
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
	const id = JSON.stringify(json)
	const typeId = JSON.stringify(typeJson)
	// if (BaseNode.#builtins?.unknownUnion.typeId === typeId) {
	// 	return BaseNode.#builtins.unknown as never
	// }
	const innerEntries = entriesOf(inner)
	let collapsibleJson = json
	if (innerEntries.length === 1 && innerEntries[0][0] === kind) {
		collapsibleJson = json[kind] as never
		if (hasDomain(collapsibleJson, "object")) {
			json = collapsibleJson
			typeJson = collapsibleJson
		}
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
	return new (NodeImplementationByKind[kind] as any)(attachments)
}

const defaultValueSerializer = (v: unknown) => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	) {
		return v
	}
	return compileSerializedValue(v)
}
