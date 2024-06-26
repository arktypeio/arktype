import { domainOf, hasDomain } from "./domain.js"
import { throwError, throwInternalError } from "./errors.js"
import { objectKindOf } from "./objectKinds.js"
import { serializePrimitive, type SerializablePrimitive } from "./primitive.js"
import type { PartialRecord } from "./records.js"

declare global {
	export const $ark: ArkEnv.registry

	export interface ArkEnv {
		registry(): {}
	}

	export namespace ArkEnv {
		export type registry = PartialRecord<string, object | symbol> &
			ReturnType<ArkEnv["registry"]>
	}
}

if ("$ark" in globalThis) {
	throwError(
		`Tried to initialize an $ark registry but one already existed.
This probably means you are either depending on multiple versions of an arktype package,
or importing the same package from both ESM and CJS.
Review package.json versions across your repo to ensure consistency.`
	)
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

export const reference = (name: string): RegisteredReference => `$ark.${name}`

export const registeredReference = (
	value: object | symbol
): RegisteredReference => reference(register(value))

export type RegisteredReference<to extends string = string> = `$ark.${to}`

export const isDotAccessible = (keyName: string): boolean =>
	/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(keyName)

export const compileSerializedValue = (value: unknown): string =>
	hasDomain(value, "object") || typeof value === "symbol" ?
		registeredReference(value)
	:	serializePrimitive(value as SerializablePrimitive)

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
