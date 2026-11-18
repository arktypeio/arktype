import type { array } from "./arrays.ts"
import { throwParseError } from "./errors.ts"
import type { noInfer } from "./generics.ts"
import type { requireKeys } from "./records.ts"
import { isDotAccessible } from "./serialize.ts"

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

// what a key adds to a path before it, cached since the same keys recur: one
// lookup, where asking whether it's an identifier and writing it after a dot
// were a lookup and two strings
const keySuffixes = new Map<string, string>()

const keySuffixOf = (key: string): string => {
	let suffix = keySuffixes.get(key)
	if (suffix === undefined) {
		suffix = isDotAccessible(key) ? `.${key}` : `[${JSON.stringify(key)}]`
		// bounded, since keys can come from data
		if (key.length <= 64) {
			if (keySuffixes.size === 1024) keySuffixes.clear()
			keySuffixes.set(key, suffix)
		}
	}
	return suffix
}

// an index's brackets, by the index
const indexSuffixes: string[] = []

export const appendStringifiedKey: AppendStringifiedKeyFn = ((
	path: string,
	prop: unknown,
	opts?: StringifyPathOptions<unknown>
) => {
	switch (typeof prop) {
		case "string": {
			const suffix = keySuffixOf(prop)
			// a first key that's an identifier is written without its dot
			return path === "" && suffix[0] === "." ? prop : path + suffix
		}
		case "number":
			return (
				path +
				(prop >>> 0 === prop && prop < 256 ?
					(indexSuffixes[prop] ??= `[${prop}]`)
				:	`[${prop}]`)
			)
		case "symbol":
			// as String writes it, its description whole
			return `${path}[${(opts?.stringifySymbol ?? String)(prop)}]`
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

// one or two keys are copied as a literal, which TurboFan allocates inline
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
