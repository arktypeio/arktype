import { domainOf, hasDomain } from "./domain.js"
import { throwInternalError } from "./errors.js"
import { objectKindOf } from "./objectKinds.js"
import { serializePrimitive, type SerializablePrimitive } from "./serialize.js"

export const registry: Record<string, unknown> = {}
;(globalThis as any).$ark = registry

const namesByResolution = new WeakMap<object | symbol, string>()
const nameCounts: Record<string, number | undefined> = {}

export const reference = (value: object | symbol) => {
	const existingName = namesByResolution.get(value)
	if (existingName) {
		return existingName
	}

	const baseName = baseNameFor(value)
	nameCounts[baseName] ??= 1
	const uniqueName = `${baseName}${nameCounts[baseName]!++}`
	registry[uniqueName] = value
	namesByResolution.set(value, uniqueName)
	return `$ark.${uniqueName}`
}

export const isDotAccessible = (name: string) =>
	/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name)

export const compileSerializedValue = (value: unknown) => {
	return hasDomain(value, "object") || typeof value === "symbol"
		? reference(value)
		: serializePrimitive(value as SerializablePrimitive)
}

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
