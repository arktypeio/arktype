import { fromHere } from "@ark/fs"
import { hasArkKind, type BaseRoot } from "@ark/schema"
import { noSuggest, ParseError } from "@ark/util"
import {
	holeNamePrefix,
	keyOf,
	precompileStandalone,
	precompileStandaloneModules,
	type StandaloneExport
} from "arktype/internal/standalone.ts"
import * as arktypeRuntime from "arktype/internal/runtimeExports.ts"
import { DynamicValue } from "@ark/precompile/internal/dynamic.ts"
import { buildSync } from "esbuild"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { inspect } from "node:util"

// compares a Type with the validators it precompiles to on what design/precompile.md §2 observes of a call

export type Layout = "inline" | "modules"

export const layouts: Layout[] = ["inline", "modules"]

export const out = mkdtempSync(join(tmpdir(), "ark-differential-"))

// the artifacts' own copy of the runtime, so they share no state with arktype
buildSync({
	stdin: {
		contents: `export * from "arktype/runtime"`,
		resolveDir: fromHere(),
		loader: "js"
	},
	bundle: true,
	format: "esm",
	platform: "neutral",
	conditions: ["ark-ts"],
	outfile: join(out, "runtime.js"),
	logLevel: "error"
})

const entryKey = noSuggest("loadedArktypeEntry")

const importBesideArktype = async (path: string): Promise<any> => {
	const entries = globalThis as Record<string, unknown>
	const entry = entries[entryKey]
	delete entries[entryKey]
	try {
		return await import(pathToFileURL(path).href)
	} finally {
		entries[entryKey] = entry
	}
}

// a function the runtime exports for arktype's nodes to hold, like a matcher's onFail, is its copy's in what an artifact creates
const counterparts = new Map<unknown, unknown>()
for (const [name, copy] of Object.entries(
	await importBesideArktype(join(out, "runtime.js"))
)) {
	const original = (arktypeRuntime as Record<string, unknown>)[name]
	if (typeof copy === "function" && typeof original === "function")
		counterparts.set(copy, original)
}

const link = (code: string) =>
	code
		.replace(/from "arktype\/runtime"/g, `from "./runtime.js"`)
		.replace(/"~arktype\/([^"]+)"/g, `"./$1.js"`)

// every artifact's modules are files of one directory, as a bundle shares them
const modulesBySpecifier: Record<string, string> = {}

let artifactCount = 0

const loadArtifact = async (
	exports: Record<string, StandaloneExport>,
	layout: Layout
): Promise<any> => {
	let code: string
	if (layout === "inline") code = precompileStandalone(exports)
	else {
		const artifact = precompileStandaloneModules(exports)
		for (const [specifier, module] of Object.entries(artifact.modules)) {
			const written = modulesBySpecifier[specifier]
			if (written === undefined) {
				modulesBySpecifier[specifier] = module
				writeFileSync(join(out, `${specifier.slice(9)}.js`), link(module))
			} else if (written !== module) {
				throw new Error(
					`${specifier} names two modules:\n${written}\n${module}`
				)
			}
		}
		code = artifact.code
	}
	const path = join(out, `artifact${artifactCount++}.js`)
	writeFileSync(path, link(code))
	return importBesideArktype(path)
}

// a precompiled Type holding functions or symbols is a factory, passed them as a build passes what its site holds
const exportOf = (node: BaseRoot, holes: unknown[]): StandaloneExport => {
	if (!holes.length) return node as never
	const classes = new Set(
		[node, ...node.references].flatMap(n => (n.hasKind("proto") ? n.proto : []))
	)
	return {
		type: node as never,
		params: holes.map((hole, i) => ({
			kind:
				typeof hole === "symbol" ? "symbol"
				: classes.has(hole as never) ? "class"
				: "function",
			label: `hole${i}`,
			value: hole
		}))
	}
}

const placeholdersByHole = new Map<unknown, string>()

// a build names each function it holds by a placeholder, which its factory completes with the name of the function it receives
const loadNamingHoles = async (
	node: BaseRoot,
	holes: unknown[],
	layout: Layout
): Promise<any> => {
	const descriptors = holes.map(hole =>
		typeof hole === "function" ?
			Object.getOwnPropertyDescriptor(hole, "name")
		:	undefined
	)
	for (const hole of holes) {
		if (typeof hole !== "function") continue
		placeholdersByHole.set(
			hole,
			placeholdersByHole.get(hole) ??
				`${holeNamePrefix}${placeholdersByHole.size.toString(36)}`
		)
		Object.defineProperty(hole, "name", {
			value: placeholdersByHole.get(hole),
			configurable: true
		})
	}
	try {
		return await loadArtifact({ T: exportOf(node, holes) }, layout)
	} finally {
		for (const [i, hole] of holes.entries()) {
			if (typeof hole !== "function") continue
			if (descriptors[i]) Object.defineProperty(hole, "name", descriptors[i])
			else delete (hole as { name?: string }).name
		}
	}
}

// copies data with its prototypes, descriptors, cycles and frozenness, so each call gets its own input;
// functions and builtins other than arrays, Dates, RegExps, Maps and Sets are shared
export const cloneInput = (
	value: unknown,
	seen = new Map<object, unknown>()
): unknown => {
	if (typeof value !== "object" || value === null) return value
	if (seen.has(value)) return seen.get(value)
	const tag = Object.prototype.toString.call(value)
	const copy =
		tag === "[object Array]" ? new Array((value as unknown[]).length)
		: tag === "[object Date]" ? new Date((value as Date).getTime())
		: tag === "[object RegExp]" ? new RegExp(value as RegExp)
		: tag === "[object Map]" ? new Map()
		: tag === "[object Set]" ? new Set()
		: tag === "[object Object]" && !(value instanceof Error) ? {}
		: undefined
	if (!copy) return value
	Object.setPrototypeOf(copy, Object.getPrototypeOf(value))
	seen.set(value, copy)
	if (copy instanceof Map) {
		for (const [k, v] of value as Map<unknown, unknown>)
			copy.set(cloneInput(k, seen), cloneInput(v, seen))
	}
	if (copy instanceof Set)
		for (const v of value as Set<unknown>) copy.add(cloneInput(v, seen))
	for (const k of Reflect.ownKeys(value)) {
		if (tag === "[object Array]" && k === "length") continue
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		if ("value" in descriptor)
			descriptor.value = cloneInput(descriptor.value, seen)
		Object.defineProperty(copy, k, descriptor)
	}
	if (Object.isFrozen(value)) Object.freeze(copy)
	else if (Object.isSealed(value)) Object.seal(copy)
	else if (!Object.isExtensible(value)) Object.preventExtensions(copy)
	return copy
}

const { toString } = Object.prototype

// a pair already being compared is assumed equal, so a graph sharing subgraphs is walked once per pair
const isEqual = (l: unknown, r: unknown): boolean => {
	const seen = new Map<object, Set<object>>()
	const equals = (l: any, r: any): boolean => {
		if (Object.is(l, r) || counterparts.get(r) === l) return true
		if (
			typeof l !== "object" ||
			typeof r !== "object" ||
			l === null ||
			r === null
		)
			return false
		let compared = seen.get(l)
		if (compared?.has(r)) return true
		if (!compared) seen.set(l, (compared = new Set()))
		compared.add(r)
		if (Object.getPrototypeOf(l) !== Object.getPrototypeOf(r)) return false
		const tag = toString.call(l)
		if (tag !== toString.call(r)) return false
		// an object can have a builtin's prototype without being one
		if (tag === "[object Date]") return Object.is(l.getTime(), r.getTime())
		if (tag === "[object RegExp]") return String(l) === String(r)
		if (tag === "[object Map]" || tag === "[object Set]") {
			const lEntries = [...l]
			const rEntries = [...r]
			if (
				lEntries.length !== rEntries.length ||
				!lEntries.every((entry, i) => equals(entry, rEntries[i]))
			)
				return false
		}
		if (tag === "[object Error]" && String(l) !== String(r)) return false
		const lKeys = Reflect.ownKeys(l)
		const rKeys = Reflect.ownKeys(r)
		if (lKeys.length !== rKeys.length) return false
		for (let i = 0; i < lKeys.length; i++) {
			if (lKeys[i] !== rKeys[i]) return false
			const lDescriptor = Object.getOwnPropertyDescriptor(l, lKeys[i])!
			const rDescriptor = Object.getOwnPropertyDescriptor(r, rKeys[i])!
			if (
				"value" in lDescriptor !== "value" in rDescriptor ||
				lDescriptor.enumerable !== rDescriptor.enumerable ||
				("value" in lDescriptor &&
					!equals(lDescriptor.value, rDescriptor.value))
			)
				return false
		}
		return true
	}
	try {
		return equals(l, r)
	} catch (e) {
		if (!(e instanceof RangeError)) throw e
		// data nested past the stack is compared by its inspection to a fixed depth
		return inspect(l, { depth: 200 }) === inspect(r, { depth: 200 })
	}
}

const observe = (run: () => unknown, input: unknown): unknown => {
	try {
		const result: any = run()
		return hasArkKind(result, "errors") ?
				{
					summary: result.summary,
					json: result.toJSON(),
					errors: result.issues.map((e: any) => ({
						keys: Reflect.ownKeys(e),
						code: e.code,
						path: [...e.path],
						data: e.data,
						expected: e.expected,
						actual: e.actual,
						problem: e.problem,
						message: e.message
					}))
				}
			:	{ out: result, isInput: result === input }
	} catch (e) {
		return { threw: String(e) }
	}
}

type Validator = Record<string, any> & ((data: unknown) => unknown)

const observeAttributes = (t: Validator) => ({
	expression: t.expression,
	description: t.description,
	string: t.toString(),
	meta: t.meta
})

const observeCall = (t: Validator, input: unknown) => {
	const traversed = cloneInput(input)
	return {
		traverse: observe(() => t.traverse(traversed), traversed),
		mutated: traversed,
		allows: observe(() => t.allows(cloneInput(input)), undefined),
		assert: observe(() => t.assert(cloneInput(input)), undefined),
		standard: observe(
			() => t["~standard"].validate(cloneInput(input)),
			undefined
		)
	}
}

// a hole returning arktype's own errors or nodes, which a validator's runtime doesn't recognize
const holdsArkValue = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (
		(typeof value !== "object" && typeof value !== "function") ||
		value === null ||
		seen.has(value)
	)
		return false
	seen.add(value)
	if ((value as any)[" arkKind"]) return true
	if (typeof value === "function") return false
	return Reflect.ownKeys(value).some(k => {
		const descriptor = Object.getOwnPropertyDescriptor(value, k)!
		return "value" in descriptor && holdsArkValue(descriptor.value, seen)
	})
}

export interface Observations {
	attributes: ReturnType<typeof observeAttributes>
	// undefined where a hole holding state makes two calls disagree
	calls: (ReturnType<typeof observeCall> | undefined)[]
}

// what arktype observes, before a build renames the functions a Type holds
export const observeArktype = (
	node: BaseRoot,
	inputs: unknown[]
): Observations => ({
	attributes: observeAttributes(node as never),
	calls: inputs.map(input => {
		const call = observeCall(node as never, input)
		return isEqual(call, observeCall(node as never, input)) ? call : undefined
	})
})

export interface Comparison {
	refusal?: string
	harnessLimited: number
	disagreements: string[]
}

export const compare = async (
	node: BaseRoot,
	inputs: unknown[],
	arktype: Observations
): Promise<Comparison> => {
	const result: Comparison = { harnessLimited: 0, disagreements: [] }
	const holes = keyOf(node)[1]
	for (const layout of layouts) {
		const disagree = (observation: string, details: object) =>
			result.disagreements.push(
				inspect(
					{ expression: node.expression, layout, observation, ...details },
					{ depth: 5, breakLength: 120 }
				).slice(0, 4000)
			)
		let artifact: any
		try {
			artifact = await loadNamingHoles(node, holes, layout)
		} catch (e) {
			const refusal =
				e instanceof ParseError ? e.message.split("\n")[0]
				: e instanceof DynamicValue ? "a stand-in a build created it with"
				: undefined
			if (refusal === undefined) disagree("build", { threw: String(e) })
			else if (layout === layouts[0]) result.refusal = refusal
			else if (result.refusal === undefined) disagree("refusal", { refusal })
			continue
		}
		if (result.refusal !== undefined) {
			disagree("refusal", { [layouts[0]]: result.refusal })
			continue
		}
		let validator: Validator
		try {
			validator = artifact.T(...holes)
		} catch (e) {
			disagree("creation", { threw: String(e) })
			continue
		}
		const attributes = observeAttributes(validator)
		if (!isEqual(arktype.attributes, attributes)) {
			disagree("attributes", {
				arktype: arktype.attributes,
				precompiled: attributes
			})
		}
		for (const [i, input] of inputs.entries()) {
			const expected = arktype.calls[i]
			const actual = observeCall(validator, input)
			if (expected && isEqual(expected, actual)) continue
			if (!expected || holdsArkValue(actual)) {
				if (layout === layouts[0]) result.harnessLimited++
			} else disagree("call", { input, arktype: expected, precompiled: actual })
		}
	}
	return result
}
