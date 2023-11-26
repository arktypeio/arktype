import { domainOf, objectKindOf, throwInternalError } from "@arktype/util"
import type { BaseNode, UnknownNode } from "../base.js"
import type { SchemaNode } from "../schema.js"

export const arkKind = Symbol("ArkTypeInternalKind")

export const isNode = (o: unknown): o is UnknownNode =>
	(o as any)?.[arkKind] === "node"

declare global {
	const $ark: Registry
}

class Registry {
	[k: string]: unknown

	/** Set internally to avoid circular imports */
	declare BaseNode: typeof BaseNode
	/** Set internally to avoid circular imports */
	declare SchemaNode: typeof SchemaNode

	// immediately initialize an instance on import so the global reference resolves
	static {
		new Registry()
	}

	constructor() {
		const global = globalThis as any
		if (global.$ark) {
			return global.$ark as Registry
		}
		global.$ark = this
	}

	register(value: object | symbol) {
		const baseName = baseNameFor(value)
		let variableName = baseName
		let suffix = 2
		while (variableName in this && this[variableName] !== value) {
			variableName = `${baseName}${suffix++}`
		}
		this[variableName] = value
		return variableName
	}
}

export const isDotAccessible = (name: string) =>
	/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name)

const baseNameFor = (value: object | symbol) => {
	switch (typeof value) {
		case "object":
			if (value === null) {
				break
			}
			const prefix = objectKindOf(value) ?? "object"
			// convert to camelCase
			return prefix[0].toLowerCase() + prefix.slice(1)
		case "function":
			return isDotAccessible(value.name) ? value.name : "anonymousFunction"
		case "symbol":
			return value.description && isDotAccessible(value.description)
				? value.description
				: "anonymousSymbol"
	}
	return throwInternalError(
		`Unexpected attempt to register serializable value of type ${domainOf(
			value
		)}`
	)
}
