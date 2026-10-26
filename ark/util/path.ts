import { ReadonlyArray, type array } from "./arrays.ts"
import { throwParseError } from "./errors.ts"
import type { noInfer } from "./generics.ts"
import type { requireKeys } from "./records.ts"
import { isDotAccessible, printSymbol, type JsonArray } from "./serialize.ts"

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
	:	noInfer<[opts: StringifyPathOptions<stringifiable>], stringifiable>
) => string

export type AppendStringifiedKeyFn = <stringifiable>(
	path: string,
	prop: stringifiable,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: StringifyPathOptions]
	:	noInfer<[opts: StringifyPathOptions<stringifiable>], stringifiable>
) => string

export const appendStringifiedKey: AppendStringifiedKeyFn = ((
	path: string,
	prop: unknown,
	opts?: StringifyPathOptions<unknown>
) => {
	switch (typeof prop) {
		case "string":
			return (
				isDotAccessible(prop) ?
					path === "" ?
						prop
					:	`${path}.${prop}`
				:	`${path}[${JSON.stringify(prop)}]`
			)
		case "number":
			return `${path}[${prop}]`
		case "symbol":
			return `${path}[${(opts?.stringifySymbol ?? printSymbol)(prop)}]`
	}
	// printed by its type, so stringifying a path needs no printer
	return opts?.stringifyNonKey ?
			`${path}[${opts.stringifyNonKey(prop)}]`
		:	throwParseError(
				`${typeof prop} must be a PropertyKey or stringifyNonKey must be passed to options`
			)
}) as never

export const stringifyPath: StringifyPathFn = ((
	path: array<unknown>,
	opts?: StringifyPathOptions<unknown>
) => {
	let s = ""
	for (const k of path) s = appendStringifiedKey(s, k, opts as never)
	return s
}) as never

// a copy of path, with key below it, copying one or two keys as a literal,
// which TurboFan allocates inline where slice() calls a builtin
export const pathAt = (
	path: PropertyKey[],
	key?: PropertyKey
): PropertyKey[] => {
	if (key !== undefined) path.push(key)
	const copy =
		path.length === 1 ? [path[0]]
		: path.length === 2 ? [path[0], path[1]]
		: path.slice()
	if (key !== undefined) path.pop()
	return copy
}

export class ReadonlyPath extends ReadonlyArray<PropertyKey> {
	// alternate strategy for caching since the base object is frozen
	private cache: {
		stringifyAncestors?: readonly string[]
		json?: JsonArray
	} = {}

	constructor(...items: array<PropertyKey>) {
		super()
		// a single number would create empty slots
		for (let i = 0; i < items.length; i++) (this as any)[i] = items[i]
	}

	toJSON(): JsonArray {
		if (this.cache.json) return this.cache.json
		this.cache.json = []
		for (let i = 0; i < this.length; i++) {
			this.cache.json.push(
				typeof this[i] === "symbol" ?
					printSymbol(this[i] as symbol)
				:	(this[i] as never)
			)
		}

		return this.cache.json
	}

	stringify(): string {
		return this.stringifyAncestors()[this.length]
	}

	stringifyAncestors(): readonly string[] {
		if (this.cache.stringifyAncestors) return this.cache.stringifyAncestors
		let propString = ""
		const result: string[] = [propString]
		for (let i = 0; i < this.length; i++) {
			propString = appendStringifiedKey(propString, this[i])
			result.push(propString)
		}
		return (this.cache.stringifyAncestors = result)
	}
}
