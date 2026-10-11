import { fromHere } from "@ark/fs"
import { hasArkKind, type BaseRoot } from "@ark/schema"
import { arityOf, hasDomain, noSuggest, ParseError } from "@ark/util"
import {
	holeNameMarker,
	introspectionMembers,
	isJsonSchemaError,
	keyOf,
	precompileStandalone,
	precompileStandaloneModules,
	type FoldedMember,
	type StandaloneExport
} from "arktype/internal/standalone.ts"
import type { IntrospectionMember } from "arktype/internal/runtime.ts"
import * as arktypeRuntime from "arktype/internal/runtimeExports.ts"
import {
	bakedJsonSchemaOptionsMessage,
	writeUnbakedMessage
} from "arktype/runtime"
import { DynamicValue } from "@ark/precompile/internal/dynamic.ts"
import { buildSync } from "esbuild"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { inspect } from "node:util"

// compares a Type with the validators it precompiles to on what design/precompile.md §2 observes of a call

export type Layout = "inline" | "modules"

export const layouts: Layout[] = ["inline", "modules"]

let out: string | undefined

// a run that fails keeps its artifacts for inspection
process.once("exit", code => {
	if (!out) return
	if (code) console.error(`precompiled artifacts: ${out}`)
	else rmSync(out, { recursive: true, force: true })
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

// a function the runtime exports for arktype's nodes to hold, like a matcher's onFail or a keyword's predicate, is its copy's in what an artifact creates
const counterparts = new Map<unknown, unknown>()
const pairCopies = (copy: unknown, original: unknown): void => {
	if (typeof copy === "function" && typeof original === "function")
		counterparts.set(copy, original)
	else if (
		hasDomain(copy, "object") &&
		hasDomain(original, "object") &&
		Object.getPrototypeOf(copy) === Object.prototype
	) {
		for (const [k, v] of Object.entries(copy))
			pairCopies(v, (original as Record<string, unknown>)[k])
	}
}

// the directory of the artifacts, created when the first is written with their own copy of the runtime, so they share no state with arktype
export const outDir = async (): Promise<string> => {
	if (out) return out
	const dir = (out = mkdtempSync(join(tmpdir(), "ark-differential-")))
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
		outfile: join(dir, "runtime.js"),
		logLevel: "error"
	})
	for (const [name, copy] of Object.entries(
		await importBesideArktype(join(dir, "runtime.js"))
	))
		pairCopies(copy, (arktypeRuntime as Record<string, unknown>)[name])
	return dir
}

const link = (code: string) =>
	code
		.replace(/from "arktype\/runtime"/g, `from "./runtime.js"`)
		.replace(/"~arktype\/([^"]+)"/g, `"./$1.js"`)

// every artifact's modules are files of one directory, as a bundle shares them
const modulesBySpecifier: Record<string, string> = {}

let artifactCount = 0

// the runtime returns the validator the first artifact created at an address to every later one
const validatorAddressPattern = /runtime\.addressed\("(\w+)"/g
const createdAddresses = new Set<string>()
const reusingArtifacts = new WeakSet<object>()

const loadArtifact = async (
	exports: Record<string, StandaloneExport>,
	layout: Layout,
	introspection: IntrospectionMember[]
): Promise<any> => {
	const dir = await outDir()
	let code: string
	if (layout === "inline")
		code = precompileStandalone(exports, { introspection })
	else {
		const artifact = precompileStandaloneModules(exports, { introspection })
		for (const [specifier, module] of Object.entries(artifact.modules)) {
			const written = modulesBySpecifier[specifier]
			if (written === undefined) {
				modulesBySpecifier[specifier] = module
				writeFileSync(join(dir, `${specifier.slice(9)}.js`), link(module))
			} else if (written !== module) {
				throw new Error(
					`${specifier} names two modules:\n${written}\n${module}`
				)
			}
		}
		code = artifact.code
	}
	const path = join(dir, `artifact${artifactCount++}.js`)
	writeFileSync(path, link(code))
	let reuses = false
	for (const [, address] of code.matchAll(validatorAddressPattern)) {
		reuses ||= createdAddresses.has(address)
		createdAddresses.add(address)
	}
	const artifact = await importBesideArktype(path)
	if (reuses) reusingArtifacts.add(artifact)
	return artifact
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

// a program's runtime first reads a function's length where arktype did, which the runtime's copy here can only replay
const createReadingArities = (artifact: any, holes: unknown[]): Validator => {
	const descriptors = holes.map(hole =>
		typeof hole === "function" ?
			Object.getOwnPropertyDescriptor(hole, "length")
		:	undefined
	)
	for (const hole of holes) {
		if (typeof hole === "function")
			Object.defineProperty(hole, "length", { value: arityOf(hole) })
	}
	try {
		return artifact.T(...holes)
	} finally {
		for (const [i, hole] of holes.entries())
			if (descriptors[i]) Object.defineProperty(hole, "length", descriptors[i])
	}
}

const placeholdersByHole = new Map<unknown, string>()

// a build names each function it holds by a placeholder, which its factory completes with the name of the function it receives
const loadNamingHoles = async (
	node: BaseRoot,
	holes: unknown[],
	layout: Layout,
	introspection: IntrospectionMember[]
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
				`${holeNameMarker}${placeholdersByHole.size.toString(36)}`
		)
		Object.defineProperty(hole, "name", {
			value: placeholdersByHole.get(hole),
			configurable: true
		})
	}
	try {
		return await loadArtifact(
			{ T: exportOf(node, holes) },
			layout,
			introspection
		)
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
		return {
			threw: String(e),
			context: (e as { context?: unknown } | undefined)?.context
		}
	}
}

type Validator = Record<string, any> & ((data: unknown) => unknown)

// every member a build can bake, so each is compared where arktype's can be read
const introspection = [...introspectionMembers]

const observeAttributes = (t: Validator) => ({
	expression: t.expression,
	description: t.description,
	string: t.toString(),
	meta: t.meta
})

type Introspection = ReturnType<typeof observeIntrospection>

const observeIntrospection = (t: Validator) => ({
	json: observe(() => t.json, undefined),
	isToJsonTheJson: observe(() => t.toJSON() === t.json, undefined),
	jsonSchema: observe(() => t.toJsonSchema(), undefined),
	// options naming nothing, and each target, whose schema a validator writes only where it bakes it
	jsonSchemaByOptions: [
		{},
		{ target: "draft-2020-12" },
		{ target: "draft-07" }
	].map(opts => observe(() => t.toJsonSchema(opts), undefined)),
	// a target arktype supports, the other and one it rejects
	standardJsonSchema: (["input", "output"] as const).flatMap(io =>
		["draft-2020-12", "draft-07", "openapi-3.0"].map(target =>
			observe(() => t["~standard"].jsonSchema[io]({ target }), undefined)
		)
	)
})

const unbakedSuffix = writeUnbakedMessage("")

const threwUnbaked = (observation: unknown): boolean =>
	(observation as { threw?: string }).threw?.endsWith(unbakedSuffix) ?? false

const threwOptions = (observation: unknown): boolean =>
	(observation as { threw?: string }).threw?.endsWith(
		bakedJsonSchemaOptionsMessage
	) ?? false

// a schema the build can't bake throws why where it's read, as one for a target it doesn't bake does, so arktype's is left uncompared
const maskUnbaked = (
	arktype: Introspection,
	baked: Introspection
): Introspection => ({
	...arktype,
	jsonSchema:
		threwUnbaked(baked.jsonSchema) ? baked.jsonSchema : arktype.jsonSchema,
	jsonSchemaByOptions: arktype.jsonSchemaByOptions.map((observation, i) =>
		(
			threwUnbaked(baked.jsonSchemaByOptions[i]) ||
			// options naming nothing are always the configured schema
			(i > 0 && threwOptions(baked.jsonSchemaByOptions[i]))
		) ?
			baked.jsonSchemaByOptions[i]
		:	observation
	),
	standardJsonSchema: arktype.standardJsonSchema.map((observation, i) =>
		threwUnbaked(baked.standardJsonSchema[i]) ?
			baked.standardJsonSchema[i]
		:	observation
	)
})

const foldedMembers = introspectionMembers.filter(
	(member): member is FoldedMember => member !== "~standard.jsonSchema"
)

const printsName = (data: unknown): boolean =>
	typeof data === "string" ?
		data.includes("$ark.") || data.includes(holeNameMarker)
	:	typeof data === "object" &&
		data !== null &&
		Object.values(data).some(printsName)

// what a site reading the Type's json, toJSON() or toJsonSchema() folds to, which a build refuses where it prints a function's name
const foldedIntrospectionOf = (
	node: BaseRoot
): Record<string, StandaloneExport> => {
	const exports: Record<string, StandaloneExport> = {}
	for (const member of foldedMembers) {
		let data: unknown
		let thrown: unknown
		try {
			data = member === "json" ? node.json : node[member]()
		} catch (e) {
			if (!isJsonSchemaError(e)) continue
			thrown = e
		}
		if (!printsName(thrown ? String(thrown) : data))
			exports[member] = { member, type: node, data, params: [], thrown }
	}
	return exports
}

// what each folded site returns, and whether two of its calls, toJSON() and json, or json and a validator's, return one object
const observeFolded = (
	read: (member: FoldedMember) => unknown,
	members: string[],
	readBaked: (() => unknown) | undefined
) => [
	...members.flatMap(member => [
		observe(() => read(member as FoldedMember), undefined),
		observe(
			() => read(member as FoldedMember) === read(member as FoldedMember),
			undefined
		)
	]),
	members.includes("json") && members.includes("toJSON") ?
		observe(() => read("toJSON") === read("json"), undefined)
	:	undefined,
	readBaked && observe(() => readBaked() === read("json"), undefined)
]

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
	// undefined where a hole arktype calls writing it makes two reads disagree
	introspection: ReturnType<typeof observeIntrospection> | undefined
	// undefined where a hole holding state makes two calls disagree
	calls: (ReturnType<typeof observeCall> | undefined)[]
}

// what arktype observes, before a build renames the functions a Type holds
const observeStably = <t>(observeOnce: () => t): t | undefined => {
	const observed = observeOnce()
	return isEqual(observed, observeOnce()) ? observed : undefined
}

export const observeArktype = (
	node: BaseRoot,
	inputs: unknown[]
): Observations => ({
	attributes: observeAttributes(node as never),
	introspection: observeStably(() => observeIntrospection(node as never)),
	calls: inputs.map(input => {
		const call = observeCall(node as never, input)
		return isEqual(call, observeCall(node as never, input)) ? call : undefined
	})
})

export interface Comparison {
	refusal?: string
	harnessLimited: number
	// whether its introspection was compared, which a refused bake or arktype disagreeing with itself prevents
	isIntrospected: boolean
	// whether a schema it bakes throws why the build can't write it
	isUnbaked: boolean
	// whether a site reading its introspection was compared, which data printing a function's name prevents
	isFolded: boolean
	disagreements: string[]
}

export const compare = async (
	node: BaseRoot,
	inputs: unknown[],
	arktype: Observations
): Promise<Comparison> => {
	const result: Comparison = {
		harnessLimited: 0,
		isIntrospected: false,
		isUnbaked: false,
		isFolded: false,
		disagreements: []
	}
	const holes = keyOf(node)[1]
	for (const layout of layouts) {
		const disagree = (observation: string, details: object) =>
			result.disagreements.push(
				inspect(
					{ expression: node.expression, layout, observation, ...details },
					{ depth: 5, breakLength: 120 }
				).slice(0, 4000)
			)
		await compareFolded(node, layout, result, disagree)
		let artifact: any
		// introspection the build refuses to bake leaves the rest to compare
		let isBaked = true
		try {
			artifact = await loadNamingHoles(
				node,
				holes,
				layout,
				introspection
			).catch(e => {
				if (!(e instanceof ParseError)) throw e
				isBaked = false
				return loadNamingHoles(node, holes, layout, [])
			})
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
			validator = createReadingArities(artifact, holes)
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
		if (isBaked && arktype.introspection) {
			result.isIntrospected = true
			const baked = observeIntrospection(validator)
			result.isUnbaked ||=
				threwUnbaked(baked.jsonSchema) ||
				baked.standardJsonSchema.some(threwUnbaked)
			if (!isEqual(maskUnbaked(arktype.introspection, baked), baked)) {
				disagree("introspection", {
					arktype: arktype.introspection,
					precompiled: baked
				})
			}
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

const compareFolded = async (
	node: BaseRoot,
	layout: Layout,
	result: Comparison,
	disagree: (observation: string, details: object) => void
) => {
	const folded = foldedIntrospectionOf(node)
	if (!Object.keys(folded).length) return
	// a validator baking the Type's json, which a site reading it returns as the same object
	let isBaked = !!folded.json
	let artifact: any
	try {
		artifact = await loadArtifact(
			isBaked ? { ...folded, T: node as never } : folded,
			layout,
			isBaked ? ["json"] : []
		).catch(e => {
			// e.g. a schema calling a default's thunk, which arktype calls each time it writes one
			if (!(e instanceof ParseError)) throw e
			isBaked = false
			delete folded.toJsonSchema
			return loadArtifact(folded, layout, [])
		})
	} catch (e) {
		if (!(e instanceof ParseError))
			disagree("folded build", { threw: String(e) })
		return
	}
	const members = Object.keys(folded)
	// another artifact's validator of the same address reads that artifact's json
	const readsBaked = isBaked && !reusingArtifacts.has(artifact)
	const expected = observeStably(() =>
		observeFolded(
			member => (member === "json" ? node.json : node[member]()),
			members,
			readsBaked ? () => node.json : undefined
		)
	)
	if (!members.length || !expected) return
	result.isFolded = true
	const actual = observeFolded(
		member => artifact[member](),
		members,
		readsBaked ? () => artifact.T().json : undefined
	)
	if (!isEqual(expected, actual))
		disagree("folded", { members, arktype: expected, precompiled: actual })
}
