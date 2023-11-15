import {
	ParseError,
	hasDomain,
	throwInternalError,
	type Json,
	type JsonData,
	type entriesOf
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.ts"
import { compileSerializedValue } from "./io/compile.ts"
import type { NodeKind, UnknownNodeImplementation } from "./main.ts"
import { BaseNode, type UnknownNode } from "./node.ts"
import type { parseSchemaBranches, validateSchemaBranch } from "./sets/union.ts"
import {
	NodeImplementationByKind,
	type Inner,
	type Node
} from "./shared/node.ts"

export type ParseContext = {
	basis: Node<BasisKind> | undefined
}

export const createParseContext = (): ParseContext => ({
	basis: undefined
})

const defaultValueSerializer = (v: unknown): JsonData => {
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

export type BaseAttachments<kind extends NodeKind = NodeKind> = {
	readonly kind: kind
	readonly inner: Inner<kind>
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: UnknownNode[]
	readonly entries: entriesOf<Inner<kind>>
	readonly id: string
	readonly typeId: string
}

export function parseNodeKind(
	kind: NodeKind,
	schema: unknown
	// TODO: reducible
): BaseAttachments {
	const implementation: UnknownNodeImplementation = NodeImplementationByKind[
		kind
	] as never
	const expandedSchema: Record<string, any> = implementation.expand?.(
		schema
	) ?? {
		...(schema as any)
	}
	const inner: Record<string, any> = {}
	const ctx = createParseContext()
	let json: Json = {}
	let typeJson: Json = {}
	const children: UnknownNode[] = []
	for (const [k, keyDefinition] of implementation.keyEntries) {
		if (keyDefinition.parse) {
			// even if expandedSchema[k] is undefined, parse might provide a default value
			expandedSchema[k] = keyDefinition.parse(expandedSchema[k], ctx)
		}
		if (!(k in expandedSchema)) {
			// if there is no parse function and k is undefined, it is an
			// optional key on both the schema and inner types
			continue
		}
		if (keyDefinition.children) {
			const schemaKeyChildren = expandedSchema[k]
			if (Array.isArray(schemaKeyChildren)) {
				const innerKeyChildren = schemaKeyChildren.map((child) =>
					BaseNode.parseNode(keyDefinition.children!, child)
				)
				inner[k] = innerKeyChildren
				json[k] = innerKeyChildren.map((child) => child.collapsibleJson)
				typeJson[k] = innerKeyChildren.map((child) => child.collapsibleJson)
				children.push(...innerKeyChildren)
			} else {
				const innerKeyChild = BaseNode.parseNode(
					keyDefinition.children!,
					schemaKeyChildren
				)
				inner[k] = innerKeyChild
				json[k] = innerKeyChild.collapsibleJson
				typeJson[k] = innerKeyChild.collapsibleJson
				children.push(innerKeyChild)
			}
		} else {
			inner[k] = expandedSchema[k]
			json[k] = defaultValueSerializer(keyDefinition)
			if (!keyDefinition.meta) {
				typeJson[k] = json[k]
			}
		}
		if (this[k] !== undefined) {
			// if we attempt to overwrite an existing node key, throw unless
			// it is expected and can be safely ignored.
			// in and out cannot overwrite their respective getters, so instead
			// morph assigns them to `inCache` and `outCache`
			if (k !== "in" && k !== "out") {
				throwInternalError(
					`Unexpected attempt to overwrite existing node key ${k} from ${kind} inner`
				)
			}
		} else {
			this[k] = keyDefinition as never
		}
		// remove the schema key so we know we've parsed it
		delete expandedSchema[k]
	}
	// any schema keys remaining at this point have no matching key
	// definition and are invalid
	const invalidKeys = Object.keys(expandedSchema)
	if (invalidKeys.length > 0) {
		throw new ParseError(
			`Key${
				invalidKeys.length === 1
					? ` ${invalidKeys[0]} is`
					: `s ${invalidKeys.join(", ")} are`
			} not valid on ${kind} schema`
		)
	}
	let collapsibleJson = json
	if (
		Object.keys(expandedSchema).length === 1 &&
		// the presence expand function indicates a single default key that is collapsible
		// this helps avoid nodes like `unit` which would otherwise be indiscriminable
		implementation.expand
	) {
		collapsibleJson = json[kind] as never
		if (hasDomain(collapsibleJson, "object")) {
			json = collapsibleJson
			typeJson = collapsibleJson
		}
	}
	const id = JSON.stringify(json)
	const typeId = JSON.stringify(typeJson)
	const reducedInner = implementation.reduce?.(inner) ?? inner
	if (reducedInner instanceof BaseNode) {
		return reducedInner
	}
	return new BaseNode({
		kind,
		inner: reducedInner
	})
}

export type NodeParser = {
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
}

const parseRoot: NodeParser = (...branches) =>
	BaseNode.parseRoot(branches) as never

const parseUnits = <const branches extends readonly unknown[]>(
	...values: branches
) => BaseNode.parseUnits(values)

export const node = Object.assign(parseRoot, {
	units: parseUnits
})
