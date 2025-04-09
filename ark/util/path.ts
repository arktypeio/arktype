import { ReadonlyArray, type array } from "./arrays.ts"
import { throwParseError } from "./errors.ts"
import type { requireKeys } from "./records.ts"
import { isDotAccessible } from "./registry.ts"
import { printable, type JsonArray } from "./serialize.ts"

export type StringifyPathOptions<stringifiable = PropertyKey> = requireKeys<
	{
		stringifySymbol?: (s: symbol) => string
		stringifyNonKey?: (o: Exclude<stringifiable, PropertyKey>) => string
	},
	stringifiable extends PropertyKey ? never : "stringifyNonKey"
>

export type StringifyPathFn = <stringifiable>(
	path: array<stringifiable>,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: StringifyPathOptions]
	:	NoInfer<[opts: StringifyPathOptions<stringifiable>]>
) => string

export type AppendStringifiedKeyFn = <stringifiable>(
	path: string,
	prop: stringifiable,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: StringifyPathOptions]
	:	NoInfer<[opts: StringifyPathOptions<stringifiable>]>
) => string

export const appendStringifiedKey: AppendStringifiedKeyFn = (
	path,
	prop,
	...[opts]
) => {
	const stringifySymbol = opts?.stringifySymbol ?? printable
	let propAccessChain: string = path
	switch (typeof prop) {
		case "string":
			propAccessChain =
				isDotAccessible(prop) ?
					path === "" ?
						prop
					:	`${path}.${prop}`
				:	`${path}[${JSON.stringify(prop)}]`
			break
		case "number":
			propAccessChain = `${path}[${prop}]`
			break
		case "symbol":
			propAccessChain = `${path}[${stringifySymbol(prop)}]`
			break
		default:
			if (opts?.stringifyNonKey)
				propAccessChain = `${path}[${opts.stringifyNonKey(prop as never)}]`
			else {
				throwParseError(
					`${printable(prop)} must be a PropertyKey or stringifyNonKey must be passed to options`
				)
			}
	}
	return propAccessChain
}

export const stringifyPath: StringifyPathFn = (path, ...opts) =>
	path.reduce<string>(
		(s, k) => appendStringifiedKey(s, k, ...(opts as any)),
		""
	)

export class ReadonlyPath extends ReadonlyArray<PropertyKey> {
	// alternate strategy for caching since the base object is frozen
	private cache: {
		stringify?: string
		stringifyAncestors?: readonly string[]
		json?: JsonArray
	} = {}

	constructor(...items: array<PropertyKey>) {
		super()
		// avoid case where a single number will create empty slots
		;(this as any).push(...items)
	}

	toJSON(): JsonArray {
		if (this.cache.json) return this.cache.json
		this.cache.json = []
		for (let i = 0; i < this.length; i++) {
			this.cache.json.push(
				typeof this[i] === "symbol" ? printable(this[i]) : (this[i] as never)
			)
		}

		return this.cache.json
	}

	stringify(): string {
		if (this.cache.stringify) return this.cache.stringify
		return (this.cache.stringify = stringifyPath(this))
	}

	stringifyAncestors(): readonly string[] {
		if (this.cache.stringifyAncestors) return this.cache.stringifyAncestors
		let propString = ""
		const result: string[] = [propString]
		for (const path of this) {
			propString = appendStringifiedKey(propString, path)
			result.push(propString)
		}
		return (this.cache.stringifyAncestors = result)
	}
}
