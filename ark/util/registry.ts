import { domainOf } from "./domain.ts"
import { throwInternalError } from "./errors.ts"
import { isomorphic } from "./isomorphic.ts"
import { FileConstructor, objectKindOf } from "./objectKinds.ts"

// Eventually we can just import from package.json in the source itself
// but for now, import assertions are too unstable and it wouldn't support
// recent node versions (https://nodejs.org/api/esm.html#json-modules).

// For now, we assert this matches the package.json version via a unit test.
export const arkUtilVersion = "0.56.7"

export const initialRegistryContents = {
	version: arkUtilVersion,
	filename: isomorphic.fileName(),
	FileConstructor
}

export type InitialRegistryContents = typeof initialRegistryContents

export interface ArkRegistry extends InitialRegistryContents {
	[k: string]: unknown
}

export const registry: ArkRegistry = initialRegistryContents as never

declare global {
	export interface ArkEnv {
		prototypes(): never
	}

	export namespace ArkEnv {
		export type prototypes = ReturnType<ArkEnv["prototypes"]>
	}
}

const namesByResolution = new Map<object | symbol, string>()
const namesByUnregisteredObject = new WeakMap<object, string>()
// symbols can't be WeakMap keys before ES2023
const namesByUnregisteredSymbol = new Map<symbol, string>()
const nameCounts: Record<string, number | undefined> = Object.create(null)

export const register = (value: object | symbol): string => {
	const existingName = namesByResolution.get(value)
	if (existingName) return existingName

	const name = unregisteredNameOf(value) ?? nextName(value)
	registry[name] = value
	namesByResolution.set(value, name)
	return name
}

export const registeredNameOf = (value: object | symbol): string | undefined =>
	namesByResolution.get(value)

export const nameOf = (value: object | symbol): string => {
	const existingName = namesByResolution.get(value) ?? unregisteredNameOf(value)
	if (existingName) return existingName

	const name = nextName(value)
	if (typeof value === "symbol") namesByUnregisteredSymbol.set(value, name)
	else namesByUnregisteredObject.set(value, name)
	return name
}

const unregisteredNameOf = (value: object | symbol) =>
	typeof value === "symbol" ?
		namesByUnregisteredSymbol.get(value)
	:	namesByUnregisteredObject.get(value)

const nextName = (value: object | symbol) => {
	const baseName = baseNameFor(value)
	let name = baseName
	let count = nameCounts[baseName] ?? 0
	// a name may be taken by a registry key like sets or a function named fn1
	while (name in nameCounts || name in registry) name = `${baseName}${++count}`
	nameCounts[baseName] = count
	nameCounts[name] ??= 0
	return name
}

export const isDotAccessible = (keyName: string): boolean =>
	/^[$A-Z_a-z][\w$]*$/.test(keyName)

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
