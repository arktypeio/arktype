import { domainOf, objectKindOf, throwInternalError } from "@arktype/util"
import { isDotAccessible } from "./compile.ts"

export const arkKind = Symbol("ArkTypeInternalKind")

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

	register(value: object | symbol, baseName = baseNameFor(value)) {
		let variableName = baseName
		let suffix = 2
		while (variableName in this && this[variableName] !== value) {
			variableName = `${baseName}${suffix++}`
		}
		this[variableName] = value
		return this.reference(variableName)
	}

	reference = (key: string) => `$ark.${key}` as const
}

const baseNameFor = (value: object | symbol) => {
	switch (typeof value) {
		case "object":
			const prefix = objectKindOf(value) ?? "object"
			// convert to camelCase
			return prefix[0].toLowerCase() + prefix.slice(1)
		case "function":
			return isDotAccessible(value.name) ? value.name : "anonymousFunction"
		case "symbol":
			return value.description && isDotAccessible(value.description)
				? value.description
				: "anonymousSymbol"
		default:
			return throwInternalError(
				`Unexpected attempt to register serializable value of type ${domainOf(
					value
				)}`
			)
	}
}
