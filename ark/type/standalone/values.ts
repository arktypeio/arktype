import {
	hasArkKind,
	isNode,
	jsonLengthOf,
	madeMorphs,
	type BaseNode,
	type BaseRoot
} from "@ark/schema"
import {
	appendStringifiedKey,
	cached,
	functionNameOf,
	hasDomain,
	prototypeOf,
	throwParseError
} from "@ark/util"
import { keywords } from "../keywords/keywords.ts"
import * as runtime from "../runtimeExports.ts"
import { holeNameMarker, holeNamePattern } from "./keys.ts"

// json repeats a Type at each reference, so a reused Type's text doubles per level
const maxWrittenJsonLength = 1 << 22

export const assertWritableJson = (root: BaseRoot): void => {
	const length = jsonLengthOf(root.json)
	if (length > maxWrittenJsonLength) {
		throwParseError(
			writeUnprecompilableMessage(
				`introspection writing out about ${Math.round(length / 1e6)} MB of JSON, as it repeats each Type it references`
			)
		)
	}
}

export const runtimePathsByValue = new Map<unknown, string>()

const indexRuntime = (value: unknown, path: string): void => {
	if (typeof value === "function") runtimePathsByValue.set(value, path)
	else if (hasDomain(value, "object")) {
		runtimePathsByValue.set(value, path)
		if (Object.getPrototypeOf(value) === Object.prototype) {
			for (const [k, v] of Object.entries(value))
				indexRuntime(v, appendStringifiedKey(path, k))
		}
	}
}

for (const [name, value] of Object.entries(runtime))
	indexRuntime(value, `runtime.${name}`)

// named by path, since runtime state differs between builds
export const runtimeKeyOf = (value: object | symbol): string | undefined =>
	runtimePathsByValue.get(value) ??
	((
		typeof value === "function" &&
		Reflect.get(globalThis, functionNameOf(value)) === value
	) ?
		`globalThis.${functionNameOf(value)}`
	:	undefined)

// arktype calls a default's thunk each time it writes the schema
export const assertBakeableJsonSchema = (root: BaseRoot): void => {
	if (root.references.some(callsDefaultThunk)) {
		throwParseError(
			writeUnprecompilableMessage("a JSON Schema calling a default's thunk")
		)
	}
}

const callsDefaultThunk = (node: BaseNode): boolean =>
	node.is("optional") ? typeof node.inner.default === "function"
	: node.is("sequence") ?
		!!node.defaultables?.some(([, value]) => typeof value === "function")
	:	false

export const isPlainLiteral = (value: object): boolean => {
	const prototype = prototypeOf(value)
	return (
		prototype === Object.prototype ||
		prototype === null ||
		prototype === Array.prototype
	)
}

export const isHole = (value: unknown): boolean =>
	typeof value === "symbol" ||
	(typeof value === "function" &&
		!isNode(value) &&
		!runtimePathsByValue.has(value) &&
		Reflect.get(globalThis, functionNameOf(value)) !== value)

// a keyword Type's validator bakes none of the keyword's meta
export const keywordMetas: () => Set<object> = cached(() => {
	const metas = new Set<object>()
	const collect = (module: object): void => {
		for (const value of Object.values(module)) {
			if (hasArkKind(value, "module")) collect(value)
			else if (hasArkKind(value, "root")) metas.add(value.meta)
		}
	}
	collect(keywords)
	return metas
})

// the first hole named in JSON, reading each object it shares once
export const holeNameIn = (
	json: unknown,
	seen = new Set<object>()
): string | undefined => {
	if (typeof json === "string") return json.match(holeNamePattern)?.[0]
	if (typeof json !== "object" || json === null || seen.has(json)) return
	seen.add(json)
	for (const v of Object.values(json)) {
		const name = holeNameIn(v, seen)
		if (name) return name
	}
}

export const holdsLocal = (
	value: unknown,
	seen = new Set<unknown>()
): boolean => {
	if (seen.has(value)) return false
	seen.add(value)
	if (typeof value === "string") return value.includes(holeNameMarker)
	const made = madeMorphs.get(value as never)
	if (made) return made[1].some(arg => holdsLocal(arg, seen))
	if (isHole(value)) return true
	if (!hasDomain(value, "object") || isNode(value) || !isPlainLiteral(value))
		return false
	return Reflect.ownKeys(value).some(k => {
		const v = Reflect.get(value, k)
		return (
			holdsLocal(k, seen) || (isNode(v) && v.isRoot()) || holdsLocal(v, seen)
		)
	})
}

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
