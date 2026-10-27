import type { Parser } from "prettier"
import { parsers as typescriptParsers } from "prettier/plugins/typescript"

// A module path lets @prettier/sync load the plugin in its worker, in both
// source and built packages. The parser is independent of the type checker.
export const normalizedTypePlugin = import.meta.url

type TypeNode = {
	type: string
	range: [number, number]
	[key: string]: unknown
}

const isNode = (value: unknown): value is TypeNode =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	typeof value.type === "string" &&
	"range" in value &&
	Array.isArray(value.range)

const nodesIn = (value: unknown): TypeNode[] =>
	Array.isArray(value) ? value.filter(isNode)
	: isNode(value) ? [value]
	: []

const compare = (l: string, r: string): number =>
	l < r ? -1
	: l > r ? 1
	: 0

const propertyName = (node: TypeNode): string | undefined => {
	if (node.type !== "TSPropertySignature" || node.computed) return
	const key = node.key
	if (!isNode(key)) return
	if (typeof key.name === "string") return key.name
	if (typeof key.value === "string" || typeof key.value === "number")
		return String(key.value)
}

// Normalize children first so unions of object types sort by their normalized
// contents. Returned text is only a sort key; Prettier prints the actual AST.
const normalize = (node: TypeNode, source: string): string => {
	const children = Object.entries(node)
		.filter(([key]) => key !== "comments" && key !== "tokens")
		.flatMap(([, value]) => nodesIn(value))
		.sort((l, r) => l.range[0] - r.range[0])
	const text = new Map(children.map(child => [child, normalize(child, source)]))

	if (node.type === "TSUnionType") {
		const types = nodesIn(node.types).sort((l, r) =>
			compare(text.get(l)!, text.get(r)!)
		)
		node.types = types
		return types.map(type => text.get(type)).join(" | ")
	}
	if (node.type === "TSTypeLiteral") {
		const members = nodesIn(node.members)
		const properties = members
			.filter(member => propertyName(member) !== undefined)
			.sort((l, r) => compare(propertyName(l)!, propertyName(r)!))
		let index = 0
		// Keep overloads, index signatures and computed keys in their slots.
		node.members = members.map(member =>
			propertyName(member) === undefined ? member : properties[index++]
		)
		return `{ ${nodesIn(node.members)
			.map(member => text.get(member))
			.join(" ")} }`
	}

	let result = ""
	let start = node.range[0]
	for (const child of children) {
		result += source.slice(start, child.range[0]) + text.get(child)
		start = child.range[1]
	}
	return result + source.slice(start, node.range[1])
}

export const parsers: Record<string, Parser<unknown>> = {
	"attest-normalized-type": {
		...typescriptParsers.typescript,
		parse: async (text, options) => {
			const ast: unknown = await typescriptParsers.typescript.parse(
				text,
				options
			)
			if (!isNode(ast)) throw new Error("Expected a TypeScript syntax tree")
			normalize(ast, text)
			return ast
		}
	}
}
