import {
	hasArkKind,
	isNode,
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
import type { IntrospectionMember } from "../runtime.ts"
import * as runtime from "../runtimeExports.ts"
import { holeNameMarker, holeNamePattern } from "./keys.ts"

// json and a JSON Schema repeat a Type at each reference, so a reused Type's
// text doubles per level; past this many chars a site's introspection fails
export const defaultBakedLimit = 1 << 20

const sizeOf = (chars: number): string =>
	chars >= 1e6 ? `${(chars / 1e6).toFixed(1)} MB`
	: chars >= 1e4 ? `${Math.round(chars / 1e3)} KB`
	: chars >= 1e3 ? `${(chars / 1e3).toFixed(1)} KB`
	: `${chars} chars`

export type BakedLengths = Partial<Record<IntrospectionMember, number>>

export const totalBaked = (lengths: BakedLengths): number =>
	Object.values(lengths).reduce((sum, length) => sum + length!, 0)

export const writeBakedLimitMessage = (
	lengths: BakedLengths,
	limit: number
): string => {
	const members = Object.entries(lengths)
		.map(([member, length]) => `${member} ${sizeOf(length!)}`)
		.join(", ")
	return `its introspection bakes ${sizeOf(totalBaked(lengths))} of text (${members}), over the ${sizeOf(limit)} a site may, as json and a JSON Schema repeat each Type they reference. Read fewer of its members, or leave it to arktype with // @ark-runtime or runtime: "arktype"`
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
export const runtimeKeyOf = (
	value: object | symbol | string
): string | undefined =>
	typeof value === "string" ? undefined : (
		(runtimePathsByValue.get(value) ??
		((
			typeof value === "function" &&
			Reflect.get(globalThis, functionNameOf(value)) === value
		) ?
			`globalThis.${functionNameOf(value)}`
		:	undefined))
	)

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

// a function the program creates once, which what reads it finds in one variable
export interface HoleCell {
	name: string
}

export interface HoleCells {
	// what the program's factories compare, the only ids a validator must hold
	comparedIds: ReadonlySet<string>
	byHole: Map<unknown, HoleCell>
	byPlaceholder: Map<string, HoleCell>
	// each default morph a module of its own can write, by its content
	defaults: ReadonlyMap<unknown, string>
	keyOf: (value: object | symbol | string) => string | undefined
	// whether what a morph's default reads can be written alongside it
	isDefaultShared: (morph: unknown) => boolean
}

export const cellPrefix = "~arktype/cell/"

// reads what's passed, keeping the modules setting the cells a validator reads
export const heldSpecifier = "~arktype/held"

export const cellSpecifierOf = (cell: HoleCell): string =>
	`${cellPrefix}${cell.name}`

export const cellSetterOf = (cell: HoleCell): string => `set${cell.name}`

const printsOnlyCells = (s: string, cells: HoleCells | undefined): boolean =>
	!!cells &&
	s.match(holeNamePattern)!.every(name => cells.byPlaceholder.has(name))

// what a unit reads by name, as its variable or module, needn't be its factory's
export const isReadByName = (
	ref: unknown,
	cells: HoleCells | undefined
): boolean => !!cells && (cells.byHole.has(ref) || cells.isDefaultShared(ref))

export const holdsLocal = (
	value: unknown,
	cells?: HoleCells,
	seen = new Set<unknown>()
): boolean => {
	if (seen.has(value)) return false
	seen.add(value)
	if (typeof value === "string")
		return value.includes(holeNameMarker) && !printsOnlyCells(value, cells)
	const made = madeMorphs.get(value as never)
	if (made) return made[1].some(arg => holdsLocal(arg, cells, seen))
	if (isHole(value)) return true
	if (!hasDomain(value, "object") || isNode(value) || !isPlainLiteral(value))
		return false
	return Reflect.ownKeys(value).some(k => {
		const v = Reflect.get(value, k)
		return (
			holdsLocal(k, cells, seen) ||
			(isNode(v) && v.isRoot()) ||
			holdsLocal(v, cells, seen)
		)
	})
}

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
