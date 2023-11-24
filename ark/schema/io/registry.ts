import { domainOf, objectKindOf, throwInternalError } from "@arktype/util"
import type { UnknownNode } from "../node.js"
import { isDotAccessible } from "./compile.js"

export const arkKind = Symbol("ArkTypeInternalKind")

export const isNode = (o: unknown): o is UnknownNode =>
	(o as any)?.[arkKind] === "node"

export const registry = () => new Registry()

class Registry {
	[k: string]: unknown

	constructor() {
		const global = globalThis as any
		if (global.$ark) {
			return global.$ark as Registry
		}
		global.$ark = this
	}

	register(value: object | symbol): Reference {
		const baseName = baseNameFor(value)
		let variableName = baseName
		let suffix = 2
		while (variableName in this && this[variableName] !== value) {
			variableName = `${baseName}${suffix++}`
		}
		this[variableName] = value
		return `$ark.${variableName}`
	}

	resolve(reference: Reference) {
		return this[reference.slice(5)]
	}
}

export type Reference = `$ark.${string}`

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
