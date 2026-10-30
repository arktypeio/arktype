import {
	hasArkKind,
	isNode,
	LazyGenericRoot,
	madeMorphs,
	type BaseNode,
	type BaseRoot,
	type BaseScope
} from "@ark/schema"
import {
	appendStringifiedKey,
	dateGetTime,
	hashOf,
	hasDomain,
	isArray,
	isDateObject,
	isRegExpObject,
	isThunk,
	printable
} from "@ark/util"
import { InternalTypedFn } from "../fn.ts"
import type { Foldable } from "./baking.ts"
import { rootUnitsOf } from "./compilers.ts"
import {
	collectDefaults,
	holdsDefaults,
	writtenSelectedOf,
	type CollectedDefault
} from "./units.ts"
import { isHole, isPlainLiteral, runtimeKeyOf } from "./values.ts"

// an alias defined by a thunk; a site resolving it is refused
export type ScopeAlias = [scope: BaseScope, alias: string]

export type Key = [
	id: string,
	holes: unknown[],
	// what can't be compared
	refusal: [path: string, reason: string] | undefined,
	thunks: readonly [...ScopeAlias, path: string][]
]

const keysByValue = new WeakMap<object, Key>()

export const keyOf = (value: Foldable): Key => {
	let key = keysByValue.get(value)
	if (!key) {
		keysByValue.set(
			value,
			(key = hasArkKind(value, "root") ? rootKeyOf(value) : encodeKey(value))
		)
	}
	return key
}

// 8 hash chars tell a received value from another
export const writeId = (id: string): string => JSON.stringify(id.slice(0, 8))

// traversal only: independent of the Scope methods parse in
export const traversalKeyOf = (root: BaseRoot): Key => rootKeyOf(root, false)

const rootKeyOf = (root: BaseRoot, isScoped = true): Key => {
	const units = rootUnitsOf(root)
	const defaultsByMorph = new Map<unknown, CollectedDefault>()
	// held so a codec's validator can be encoded where it's received
	const inverses: unknown[] = []
	for (const node of writtenSelectedOf(units, isKeyedBehavior)) {
		if (node.is("optional") || node.is("sequence"))
			collectDefaults(node, defaultsByMorph)
		else if (node.is("morph") && node.inverse) inverses.push(node.inverse)
	}
	return encodeKey(
		{
			name: units[0].names[root.id],
			refs: units.map(unit => unit.refs),
			...(inverses.length && { inverses }),
			meta: root.meta,
			// where its methods, like `and` and `or`, parse their arguments
			...(isScoped && { $: root.$ })
		},
		defaultsByMorph
	)
}

// a default or a codec's inverse, each part of a key
const isKeyedBehavior = (node: BaseNode): boolean =>
	holdsDefaults(node) || (node.is("morph") && !!node.inverse)

// what a key's value is read as: a definition arktype parses, a value it holds
// or a config, whose functions it calls as it creates each Type
type KeyMode = "definition" | "value" | "config"

// equal keys differ only in which functions they hold
export const encodeKey = (
	start: unknown,
	defaultsByMorph?: ReadonlyMap<unknown, CollectedDefault>,
	mode: KeyMode = defaultsByMorph ? "value" : "definition"
): Key => {
	const values: string[] = []
	const holes: unknown[] = []
	const seen = new Map<unknown, number>()
	const thunks: [...ScopeAlias, path: string][] = []
	let refusal: Key[2]
	const refuse = (reason: string) => void (refusal ??= ["", reason])
	const holeIndexOf = (hole: unknown) => {
		const index = holes.indexOf(hole)
		return index === -1 ? holes.push(hole) - 1 : index
	}
	const writeKeyOf = (kind: string, value: Foldable, path: string) => {
		const [id, held, nested, nestedThunks] = keyOf(value)
		values.push(`${kind} ${id} ${held.map(holeIndexOf)}`)
		if (nested) refusal ??= [appendPath(path, nested[0]), nested[1]]
		for (const [scope, alias, at] of nestedThunks)
			thunks.push([scope, alias, appendPath(path, at)])
	}
	const at = (path: string) => (path ? ` at \`${path}\`` : "")
	const write = (value: unknown, path: string, mode: KeyMode): void => {
		if (hasDomain(value, "object")) {
			const index = seen.get(value)
			if (index !== undefined) return void values.push(`seen ${index}`)
			seen.set(value, seen.size)
		}
		const defaulted = defaultsByMorph?.get(value)
		const runtimeKey = hasDomain(value, "object") && runtimeKeyOf(value)
		if (defaulted) {
			values.push("default")
			write(defaulted[2], path, "value")
		} else if (runtimeKey) values.push(`runtime ${runtimeKey}`)
		else if (isNode(value)) {
			if (defaultsByMorph || !value.isRoot()) values.push("node")
			else writeKeyOf("Type", value, path)
		} else if (hasArkKind(value, "module")) {
			const entries = Object.entries(value)
			values.push(`Module ${entries.length}`)
			for (const [k, entry] of entries) {
				values.push(JSON.stringify(k))
				write(entry, appendStringifiedKey(path, k), "definition")
			}
		} else if (hasArkKind(value, "scope")) {
			// a builtin scope holds only arktype's own functions, named stably
			if (value.isBuiltin) values.push(`Scope ${value.name}`)
			// e.g. a Type's, which each Type of the Scope shares
			else if (value !== start) writeKeyOf("Scope", value, path)
			else {
				const aliases = Object.entries(value.aliases)
				values.push(
					`Scope ${JSON.stringify(value.exportedNames)} ${aliases.length}`
				)
				write(value.scopeConfig, "", "config")
				// the definition, as resolving it would run default checks early
				for (const [k, def] of aliases) {
					values.push(JSON.stringify(k))
					if (isThunkAlias(def)) {
						values.push("thunk")
						thunks.push([value, k, ""])
					} else write(def, appendStringifiedKey(path, k), "definition")
				}
			}
		} else if (hasArkKind(value, "generic")) {
			values.push("Generic")
			write(value.paramDefs, path, "definition")
			// an hkt body is a function only identity tells apart
			if (value.hkt) {
				refuse(
					`has an hkt body${at(path)}, whose results decide what it creates`
				)
			} else write(value.bodyDef, path, "definition")
			write(value.$, appendStringifiedKey(path, "$"), "definition")
			// a Generic bound into another Scope parses its arguments there
			write(value.arg$, appendStringifiedKey(path, "arg$"), "definition")
		} else if (isTypedFn(value)) {
			values.push("TypedFn")
			write(value.params, path, "value")
			write(value.returns, path, "value")
			write(value.raw, path, "value")
		} else if (value instanceof LazyGenericRoot) {
			values.push(`Generic ${JSON.stringify(value.paramsDef)}`)
			write(value.bodyDef, path, "definition")
		} else if (mode === "definition" && isThunk(value))
			refuse(`holds a thunk${at(path)}, whose result decides what it creates`)
		else if (madeMorphs.has(value as never)) {
			// e.g. pipe.try's, holding the morph it wraps
			const [make, args] = madeMorphs.get(value as never)!
			values.push(`made ${runtimeKeyOf(make)}`)
			write(args, path, "value")
		}
		// e.g. a description writer, which arktype calls as it creates each Type
		else if (mode === "config" && isHole(value)) {
			refuse(
				`configures \`${path}\` with a function, whose results decide what it creates`
			)
		} else if (isHole(value)) values.push(`hole ${holeIndexOf(value)}`)
		else if (!hasDomain(value, "object")) values.push(printablePrimitive(value))
		else if (isDateObject(value)) values.push(`Date ${dateGetTime.call(value)}`)
		else if (isRegExpObject(value)) values.push(`${value} ${value.lastIndex}`)
		else if (isArray(value)) {
			values.push(`[${value.length}`)
			// e.g. the narrow in `["string", ":", isLong]`, held, not parsed
			const definitions =
				valueTupleHeads.includes(value[0]) ? 0
				: valueOperators.includes(value[1]) ? 1
				: value.length
			for (let i = 0; i < value.length; i++) {
				write(
					value[i],
					appendStringifiedKey(path, i),
					mode === "definition" && i >= definitions ? "value" : mode
				)
			}
		} else if (isPlainLiteral(value)) {
			const keys = Reflect.ownKeys(value)
			values.push(`{${keys.length}`)
			for (const k of keys) {
				write(k, path, "value")
				write(
					Reflect.get(value, k),
					typeof k === "symbol" ? path : appendStringifiedKey(path, k),
					mode
				)
			}
		} else
			refuse(`holds ${printable(value)}${at(path)}, which its key can't encode`)
	}
	write(start, "", mode)
	return [hashOf(values.join("\n")), holes, refusal, thunks]
}

export const appendPath = (path: string, rest: string): string =>
	!path ? rest
	: !rest ? path
	: rest[0] === "[" ? path + rest
	: `${path}.${rest}`

// a Generic alias is a function too, but isn't a thunk
const isThunkAlias = (def: unknown): boolean =>
	isThunk(def) &&
	!hasArkKind(def, "generic") &&
	!(def instanceof LazyGenericRoot)

export const isTypedFn = (value: unknown): value is InternalTypedFn =>
	value instanceof InternalTypedFn

export const kindNameOf = (value: unknown): string =>
	hasArkKind(value, "root") ? "Type"
	: hasArkKind(value, "module") ? "Module"
	: hasArkKind(value, "scope") ? "Scope"
	: hasArkKind(value, "generic") ? "Generic"
	: "TypedFn"

export const printablePrimitive = (value: unknown): string =>
	Object.is(value, -0) ? "-0" : printable(value)

const valueTupleHeads: unknown[] = ["instanceof", "==="]

const valueOperators: unknown[] = [":", "=>", "=", "@"]

export type ComposedString = "expression" | "description"

// shorter strings are written inline
const minComposedLength = 64

export const partsOf = (
	root: BaseRoot,
	kind: ComposedString
): (string | BaseRoot)[] => {
	const s = root[kind]
	const candidates: Record<string, BaseRoot> = Object.create(null)
	for (const node of root.references) {
		if (!node.isRoot()) continue
		const part = node[kind]
		if (
			part.length >= minComposedLength &&
			part !== s &&
			!part.includes(holeNameMarker)
		)
			candidates[part] = node
	}
	const taken: [start: number, end: number, root: BaseRoot][] = []
	for (const part of Object.keys(candidates).sort(
		(l, r) => r.length - l.length
	)) {
		for (
			let start = s.indexOf(part);
			start !== -1;
			start = s.indexOf(part, start + 1)
		) {
			const end = start + part.length
			if (
				taken.every(
					([takenStart, takenEnd]) => end <= takenStart || takenEnd <= start
				)
			)
				taken.push([start, end, candidates[part]])
		}
	}
	const parts: (string | BaseRoot)[] = []
	let at = 0
	for (const [start, end, part] of taken.sort(([l], [r]) => l - r)) {
		if (start > at) parts.push(s.slice(at, start))
		parts.push(part)
		at = end
	}
	if (at < s.length) parts.push(s.slice(at))
	return parts
}

export const holeNameMarker = "$hole_"

// two hashes can first differ inside a "$ark.name" reference
export const registeredNameAt = (
	hash: string,
	i: number
): string | undefined => {
	const start = hash.lastIndexOf('"', i - 1) + 1
	const reference = /^\$ark\d*\.([\w$]+)"/.exec(hash.slice(start))
	return reference && i > start + reference[0].indexOf(".") ?
			reference[1]
		:	undefined
}

const holeName = `[\\w$]*${holeNameMarker.replace("$", "\\$")}[\\da-z]+`

export const holeNamePattern = new RegExp(holeName, "g")

export const printedHoleNamePattern = new RegExp(
	`\\$ark\\.(${holeName})|valid according to (${holeName})|Function\\((${holeName})\\)|(${holeName})`,
	"g"
)
