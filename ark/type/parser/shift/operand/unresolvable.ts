import { hasArkKind, type BaseScope } from "@ark/schema"
import { editsBetween, hasOwn, type Dict } from "@ark/util"

/**
 * What a name from Zod, TypeScript or JSON Schema is written as here. Every key
 * is unresolvable in the default scope, and every value parses in it
 */
export const foreignAliases = {
	// TypeScript
	any: "unknown.any",
	void: "undefined",
	String: "string",
	Number: "number",
	Boolean: "boolean",
	BigInt: "bigint",
	Symbol: "symbol",
	Object: "object",
	function: "Function",
	array: "unknown[]",
	// other languages, and JSON Schema's `integer`
	str: "string",
	bool: "boolean",
	num: "number",
	int: "number.integer",
	integer: "number.integer",
	float: "number",
	double: "number",
	decimal: "number",
	"number.int": "number.integer",
	"number.float": "number",
	"number.positive": "number > 0",
	"number.negative": "number < 0",
	"number.nonnegative": "number >= 0",
	"string.nonempty": "string > 0",
	// Zod's formats, and JSON Schema's
	date: "Date",
	datetime: "string.date.iso",
	"string.datetime": "string.date.iso",
	timestamp: "number.epoch",
	email: "string.email",
	uuid: "string.uuid",
	guid: "string.uuid",
	"string.guid": "string.uuid",
	url: "string.url",
	uri: "string.url",
	"string.uri": "string.url",
	ip: "string.ip",
	ipv4: "string.ip.v4",
	ipv6: "string.ip.v6",
	"string.ipv4": "string.ip.v4",
	"string.ipv6": "string.ip.v6",
	json: "string.json",
	base64: "string.base64",
	hex: "string.hex",
	regex: "RegExp",
	regexp: "RegExp",
	nan: "number.NaN"
} as const

export type foreignAliases = typeof foreignAliases

/**
 * What follows `'name' is unresolvable` in a type error. A name from another
 * library is all it suggests: a lookup costs nothing until a definition fails,
 * and the nearest alias, which the thrown error also suggests, would cost a
 * comparison with every alias in scope
 */
export type writeUnresolvableHint<name extends string> =
	name extends keyof foreignAliases ?
		`. Did you mean '${foreignAliases[name]}'?`
	:	""

/**
 * What follows `'name' is unresolvable` in the thrown error: the definition a
 * name from another library means, else the aliases nearest to it, else the
 * names of the submodule it was read from
 */
export const writeUnresolvableHint = (
	name: string,
	$: BaseScope,
	args: Dict | undefined
): string => {
	if (hasOwn(foreignAliases, name))
		return writeDidYouMean([foreignAliases[name as keyof foreignAliases]])
	// a malformed literal like 12px is nothing an alias was meant by
	if (/^[\d-]/.test(name)) return ""
	const scopes = [args ?? {}, $.aliases, $.ambient]
	const path = name.split(".")
	let submodule: Dict | undefined
	let depth = 0
	for (; depth < path.length - 1; depth++) {
		const from: Dict | undefined =
			submodule ?? scopes.find(aliases => hasOwn(aliases, path[depth]))
		const next = from && hasOwn(from, path[depth]) ? from[path[depth]] : null
		if (!hasArkKind(next, "module")) break
		submodule = next as Dict
	}
	if (!submodule) return writeDidYouMean(nearest(name, scopes.flatMap(namesIn)))
	const prefix = `${path.slice(0, depth).join(".")}.`
	const rest = path.slice(depth).join(".")
	const keys = Object.keys(submodule).filter(k => k !== "root")
	const started = rest && keys.filter(k => k.startsWith(rest))
	const suggested =
		started && started.length ? started : nearest(rest, namesIn(submodule))
	return suggested.length ?
			writeDidYouMean(suggested.map(k => prefix + k))
		:	`. '${prefix.slice(0, -1)}' has ${keys.join(", ")}.`
}

const writeDidYouMean = (names: readonly string[]): string => {
	if (names.length === 0) return ""
	const quoted = names.slice(0, 3).map(name => `'${name}'`)
	const last = quoted.pop()
	return `. Did you mean ${quoted.length ? `${quoted.join(", ")} or ${last}` : last}?`
}

/** each alias and each submodule's, qualified by the submodule it's read from */
const namesIn = (aliases: Dict): string[] =>
	Object.keys(aliases).flatMap(k => {
		if (k === "root") return []
		const v = aliases[k]
		if (!hasArkKind(v, "module")) return [k]
		const nested = namesIn(v as Dict).map(name => `${k}.${name}`)
		return hasOwn(v as Dict, "root") ? [k, ...nested] : nested
	})

/**
 * The candidates nearest to a name: those differing from it by case alone,
 * else by the fewest edits, of at most two and fewer the shorter the name is.
 * A candidate in a submodule is also compared by its last name, so `emial`
 * finds `string.email`
 */
const nearest = (name: string, candidates: readonly string[]): string[] => {
	const lower = name.toLowerCase()
	let limit =
		name.length < 3 ? 0
		: name.length < 5 ? 1
		: 2
	let found: string[] = []
	for (const candidate of new Set(candidates)) {
		const full = candidate.toLowerCase()
		const distance = Math.min(
			editsBetween(lower, full),
			editsBetween(lower, full.slice(full.lastIndexOf(".") + 1))
		)
		if (distance > limit) continue
		if (distance < limit) found = []
		limit = distance
		found.push(candidate)
	}
	return found
}
