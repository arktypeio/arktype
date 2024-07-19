import { domainOf } from "./domain.js"
import { throwInternalError } from "./errors.js"
import { objectKindOf } from "./objectKinds.js"
import packageJson from "./package.json"
import type { PartialRecord } from "./records.js"

export type InitialRegistryContents = {
	version: string
	filename: string
}

declare global {
	export interface ArkEnv {
		registry(): {}
	}

	export namespace ArkEnv {
		export type registry = PartialRecord<string, object | symbol> &
			InitialRegistryContents &
			ReturnType<ArkEnv["registry"]>
	}
}

export const $ark: ArkEnv.registry = {
	version: packageJson.version,
	filename: import.meta.filename
} satisfies InitialRegistryContents as never

const namesByResolution = new WeakMap<object | symbol, string>()
const nameCounts: Record<string, number | undefined> = {}

export const register = (value: object | symbol): string => {
	const existingName = namesByResolution.get(value)
	if (existingName) return existingName

	let name = baseNameFor(value)
	if (nameCounts[name]) name = `${name}${nameCounts[name]!++}`
	else nameCounts[name] = 1

	$ark[name] = value
	namesByResolution.set(value, name)
	return name
}

export const isDotAccessible = (keyName: string): boolean =>
	/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(keyName)

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
