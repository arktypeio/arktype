import { domainOf, hasDomain } from "./domain.js"
import { throwInternalError } from "./errors.js"
import { objectKindOf } from "./objectKinds.js"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.js"

declare global {
	export const $ark: ArkRegistry

	export interface ArkRegistry {}
}

export const registry: Record<string, unknown> = {}
;(globalThis as any).$ark = registry

const namesByResolution = new WeakMap<object | symbol, string>()
const nameCounts: Record<string, number | undefined> = {}

export const register = (value: object | symbol): string => {
	const existingName = namesByResolution.get(value)
	if (existingName) return existingName

	let name = baseNameFor(value)
	if (nameCounts[name]) name = `${name}${nameCounts[name]!++}`
	else nameCounts[name] = 1

	registry[name] = value
	namesByResolution.set(value, name)
	return name
}

export const reference = (name: string): `$ark.${string}` => `$ark.${name}`

export const registeredReference = (value: object | symbol): `$ark.${string}` =>
	reference(register(value))

export const isDotAccessible = (keyName: string): boolean =>
	/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(keyName)

export const compileSerializedValue = (value: unknown): string => {
	return hasDomain(value, "object") || typeof value === "symbol" ?
			registeredReference(value)
		:	serializePrimitive(value as SerializablePrimitive)
}

const baseNameFor = (value: object | symbol) => {
	switch (typeof value) {
		case "object": {
			if (value === null) break

			const prefix = objectKindOf(value) ?? "object"
			// convert to camelCase
			return prefix[0].toLowerCase() + prefix.slice(1)
		}
		case "function":
			return isDotAccessible(value.name) ? value.name : "fn"
		case "symbol":
			return value.description && isDotAccessible(value.description) ?
					value.description
				:	"symbol"
	}
	return throwInternalError(
		`Unexpected attempt to register serializable value of type ${domainOf(
			value
		)}`
	)
}
