import { FileConstructor } from "./objectKinds.ts"
import { baseNameOf } from "./serialize.ts"

// Eventually we can just import from package.json in the source itself
// but for now, import assertions are too unstable and it wouldn't support
// recent node versions (https://nodejs.org/api/esm.html#json-modules).

// For now, we assert this matches the package.json version via a unit test.
export const arkUtilVersion = "3.0.0-rc.12"

// reserve internal $ark slots up front so `name in registry` prevents user
// classes or symbols with matching names (e.g. `inPlace`, `encode`) from
// hijacking lazy/opt-in runtime hooks
const reservedRegistryKeys = {
	inPlace: undefined,
	errorModes: undefined,
	encode: undefined,
	sets: undefined,
	kw: undefined,
	config: undefined,
	cfg: undefined,
	defaultConfig: undefined,
	ambient: undefined,
	nodesById: undefined,
	reached: undefined,
	deferDefaultCheck: undefined,
	eagerTypes: undefined,
	typeAttachments: undefined
}

export const initialRegistryContents: {
	version: string
	FileConstructor: typeof File
} = {
	version: arkUtilVersion,
	FileConstructor,
	...reservedRegistryKeys
}

export type InitialRegistryContents = typeof initialRegistryContents

export interface ArkRegistry extends InitialRegistryContents {
	[k: string]: unknown
}

export const registry: ArkRegistry = initialRegistryContents as never

const namesByResolution = new Map<object | symbol, string>()
// holds a symbol's name too where a symbol can be a WeakMap's key, so the name
// is kept no longer than the symbol
const namesByUnregisteredObject = new WeakMap<object, string>()
// a symbol can't be one before ES2023, nor one Symbol.for registered since
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
	try {
		namesByUnregisteredObject.set(value as object, name)
	} catch {
		namesByUnregisteredSymbol.set(value as symbol, name)
	}
	return name
}

const unregisteredNameOf = (value: object | symbol) =>
	namesByUnregisteredObject.get(value as object) ??
	namesByUnregisteredSymbol.get(value as symbol)

// "$" sorts first, so names order by base name
const nextName = (value: object | symbol) => {
	const baseName = baseNameOf(value)
	let name = baseName
	let count = nameCounts[baseName] ?? 0
	// a name may be taken by a registry key like sets or a function named fn$1
	while (isNameTaken(name) || name in registry) name = `${baseName}$${++count}`
	nameCounts[baseName] = count
	return name
}

// every name counted to from a base name is taken, so only its count is stored
const isNameTaken = (name: string) => {
	if (name in nameCounts) return true
	const counted = /^(.+)\$([1-9]\d*)$/.exec(name)
	return !!counted && Number(counted[2]) <= (nameCounts[counted[1]] ?? 0)
}
