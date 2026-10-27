import type {
	BaseNode,
	BaseRoot,
	GenericRoot as GenericRootType,
	RootApply
} from "@ark/schema"
import { createHash } from "node:crypto"
import { Session } from "node:inspector"
import { relative, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { types } from "node:util"
import { runInThisContext } from "node:vm"

// runs a sequence of test units, logging what each observes at the boundary
// between its code and arktype's

export type Step = [unit: string, file: string]

export type Plan = { list: string[] } | { steps: Step[] }

export type Observation = Record<string, unknown>

export interface RunResult {
	unitsByFile: Record<string, string[]>
	logs: Observation[][]
	loadLogsByFile: Record<string, Observation[]>
}

process.env.TZ = "America/New_York"
process.env.ATTEST_skipTypes = "true"

// the clock is part of the environment, so every run reads the same one,
// installed before arktype captures Date as a builtin
const now = Number(process.argv[2])
Date.now = () => now
globalThis.Date = new Proxy(Date, {
	construct: (target, args, newTarget) =>
		Reflect.construct(target, args.length ? args : [now], newTarget),
	apply: () => new Date(now).toString()
})

// a File's default lastModified reads the engine's clock rather than Date.now
const NativeFile = File
globalThis.File = new Proxy(NativeFile, {
	construct: (target, [bits, name, options], newTarget) =>
		Reflect.construct(
			target,
			[bits, name, { lastModified: now, ...options }],
			newTarget
		)
})

// so is Math.random, which run resets before each unit (mulberry32)
let randomState = 0
Math.random = () => {
	randomState = (randomState + 0x6d2b79f5) | 0
	let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const { ArkErrors, GenericRoot, hasArkKind, isNode, nodeClassesByKind } =
	await import("@ark/schema")
const { Callable } = await import("@ark/util")
await import("arksets")
const { scope } = await import("arktype")

const workerUrl = import.meta.url

const isUserFile = (url: string) => url.includes("/__tests__/")

const session = new Session()
session.connect()

const post = (method: string, params?: object): any => {
	let result: unknown
	session.post(method, params as never, (e, response) => {
		if (e) throw e
		result = response
	})
	return result
}

post("Profiler.enable")
post("Profiler.startPreciseCoverage", { callCount: true, detailed: false })

// counts of calls into functions defined by test files since the last take
const takeCalls = (into: Record<string, number> = {}) => {
	for (const script of post("Profiler.takePreciseCoverage").result) {
		if (!isUserFile(script.url)) continue
		const file = relative(".", fileURLToPath(script.url)).split(sep).join("/")
		for (const { functionName, ranges } of script.functions) {
			// a module's body runs only when it's first imported
			if (!ranges[0].count || (!functionName && !ranges[0].startOffset))
				continue
			const key = `${file}:${ranges[0].startOffset} ${functionName}`
			into[key] = (into[key] ?? 0) + ranges[0].count
		}
	}
	return into
}

let callCounts: Record<string, number> = {}
let log: Observation[] = []
let depth = 0
let recording = false

const callSites = (): NodeJS.CallSite[] => {
	const { prepareStackTrace, stackTraceLimit } = Error
	Error.prepareStackTrace = (_, sites) => sites
	Error.stackTraceLimit = 40
	const holder = {} as { stack: NodeJS.CallSite[] }
	Error.captureStackTrace(holder, callSites)
	const sites = holder.stack
	Error.prepareStackTrace = prepareStackTrace
	Error.stackTraceLimit = stackTraceLimit
	return sites
}

// test infrastructure, thunks and getters that run once per cache, and
// default checks, whose call counts vary by cache state
const isExcludedFrame = (url: string, site: NodeJS.CallSite) =>
	url.includes("/ark/attest/") ||
	url.endsWith("/util/lazily.ts") ||
	url.endsWith("/util/functions.ts") ||
	[
		"get in",
		"get out",
		"get encode",
		"assertDefaultValueAssignability"
	].includes(site.getFunctionName() ?? "")

type Caller = "user" | "arktype" | "excluded"

const callersOf = (sites: NodeJS.CallSite[]): Caller[] => {
	const callers: Caller[] = []
	for (const site of sites) {
		const url = site.getFileName()
		if (!url?.startsWith("file:") || url === workerUrl) continue
		if (isUserFile(url)) return [...callers, "user"]
		callers.push(isExcludedFrame(url, site) ? "excluded" : "arktype")
	}
	return callers
}

const calledByUser = (callers: Caller[]) => callers[0] === "user"

const reachedFromUser = (callers: Caller[]) =>
	callers[callers.length - 1] === "user" && !callers.includes("excluded")

// a test's Proxy traps aren't counted: they run from a frame outside any
// file, which audits of reads skip
const NativeProxy = Proxy
const uncounted: (trap: Function, handler: object) => Function =
	runInThisContext(
		`(takeCalls, counts) => (trap, handler) => (...args) => {
			takeCalls(counts())
			try {
				return trap.apply(handler, args)
			} finally {
				takeCalls()
			}
		}`,
		{ filename: "history:trap" }
	)(takeCalls, () => callCounts)
globalThis.Proxy = new NativeProxy(NativeProxy, {
	construct: (target, [object, handler]: [object, ProxyHandler<object>]) =>
		new target(
			object,
			calledByUser(callersOf(callSites())) ?
				new NativeProxy(handler, {
					get: (handler, k) => {
						const trap = Reflect.get(handler, k)
						return typeof trap === "function" ? uncounted(trap, handler) : trap
					}
				})
			:	handler
		)
})

const observeMethod = (name: string, method: Function) =>
	function (this: unknown, ...args: unknown[]): unknown {
		if (depth || recording) return method.apply(this, args)
		const callers = callersOf(callSites())
		const observation: Observation | undefined =
			calledByUser(callers) ? { call: name }
			: name === "BaseScope.fin" && reachedFromUser(callers) ? {}
			: undefined
		if (observation?.call) {
			observation.self = record(this)
			observation.args = record(args)
		}
		depth++
		let result: unknown
		try {
			result = method.apply(this, args)
		} catch (e) {
			if (observation) log.push({ ...observation, throws: record(e) })
			throw e
		} finally {
			depth--
		}
		if (observation) {
			if (observation.call) observation.result = record(result)
			else observation.define = record(result)
			log.push(observation)
		}
		return result
	}

const observeRootApply =
	(node: BaseRoot, rootApply: RootApply): RootApply =>
	(data, onFail) => {
		if (recording) return rootApply(data, onFail)
		const callers = callersOf(callSites())
		if (callers.includes("excluded")) {
			takeCalls(callCounts)
			try {
				return rootApply(data, onFail)
			} finally {
				takeCalls()
			}
		}
		if (depth || !reachedFromUser(callers)) return rootApply(data, onFail)
		const observation: Observation = { validate: record(node) }
		observation.input = record(data)
		depth++
		try {
			const output = rootApply(data, onFail)
			observation.output = record([data, output])
			return output
		} catch (e) {
			observation.throws = record(e)
			throw e
		} finally {
			depth--
			log.push(observation)
		}
	}

const patched = new Set<object>()

const patch = (prototype: object, stopAt: object) => {
	for (
		let o = prototype;
		o !== stopAt && !patched.has(o);
		o = Object.getPrototypeOf(o)
	) {
		patched.add(o)
		const className = o.constructor.name
		for (const k of Reflect.ownKeys(o)) {
			const descriptor = Object.getOwnPropertyDescriptor(o, k)!
			if (k === "constructor" || typeof descriptor.value !== "function")
				continue
			const name = `${className}.${String(k)}`
			const method: Function = descriptor.value
			descriptor.value =
				k === "initRootApply" ?
					function (this: BaseRoot) {
						const rootApply: RootApply = method.call(this)
						const observed = observeRootApply(this, rootApply)
						// an apply that checks uncompiled data isn't kept
						if (this.c.rootApply === rootApply) this.c.rootApply = observed
						return observed
					}
				:	observeMethod(name, method)
			Object.defineProperty(o, k, descriptor)
		}
	}
}

for (const nodeClass of Object.values(nodeClassesByKind))
	patch(nodeClass.prototype, Callable.prototype)
patch(GenericRoot.prototype, Callable.prototype)
patch(Object.getPrototypeOf(scope({})), Object.prototype)

const read = (get: () => unknown) => {
	try {
		return get()
	} catch (e) {
		return { "~throws": String(e) }
	}
}

// counters in registry names and ids vary by history
const normalizeJson = (json: string) =>
	json.replace(
		/\$ark\d*\.[^"]*/g,
		reference =>
			`$ark.${reference.replace(/^[^.]*\./, "").replace(/\$\d+|(?<=[A-Z_a-z])\d+/g, "")}`
	)

const sha1 = (text: string) => createHash("sha1").update(text).digest("hex")

// a node's json shares the json of each node it references, so it's written
// once per object, with any text past maxString replaced by its digest
const writeJson = (value: unknown, texts: Map<object, string>): string => {
	if (typeof value !== "object" || value === null)
		return normalizeJson(JSON.stringify(value))
	let text = texts.get(value)
	if (text !== undefined) return text
	text =
		Array.isArray(value) ?
			`[${value.map(item => writeJson(item, texts)).join(",")}]`
		:	`{${Object.entries(value)
				.map(
					([k, v]) =>
						`${normalizeJson(JSON.stringify(k))}:${writeJson(v, texts)}`
				)
				.join(",")}}`
	if (text.length > maxString) text = `{"~sha1":"${sha1(text)}"}`
	texts.set(value, text)
	return text
}

const textsOf = (node: BaseNode) => ({
	expression: read(() => node.expression),
	description: read(() => node.description),
	string: read(() => node.toString()),
	json: read(() => writeJson(node.json, new Map()))
})

const record = (value: unknown): unknown => {
	recording = true
	try {
		return serialize(value, new Map(), 0)
	} catch (e) {
		return { "~unrecordable": String(e) }
	} finally {
		recording = false
	}
}

const maxDepth = 8
const maxKeys = 100
const maxString = 2000

const serialize = (
	value: unknown,
	seen: Map<object, number>,
	depth: number
): unknown => {
	if (typeof value === "string") {
		return (
			value.length > maxString ? { "~sha1": sha1(value) }
			: value.startsWith("$ark") ? normalizeJson(value)
			: value
		)
	}
	if (value === null || typeof value === "boolean") return value
	if (typeof value === "number") {
		return Object.is(value, -0) || !Number.isFinite(value) ?
				{ "~number": Object.is(value, -0) ? "-0" : String(value) }
			:	value
	}
	if (value === undefined) return { "~undefined": true }
	if (typeof value === "bigint") return { "~bigint": String(value) }
	if (typeof value === "symbol") return { "~symbol": value.description }
	if (types.isProxy(value)) return { "~proxy": true }
	const object = value as object
	if (seen.has(object)) return { "~ref": seen.get(object) }
	seen.set(object, seen.size)
	if (isNode(object)) {
		return object.isRoot() ?
				{ "~type": serialize(textsOf(object), seen, depth) }
			:	{ "~node": object.kind, expression: read(() => object.expression) }
	}
	if (typeof object === "function")
		return { "~function": read(() => (object as Function).name) }
	if (depth > maxDepth) return { "~depth": true }
	if (object instanceof ArkErrors) {
		// errors write their text when first read, which a test may count, so
		// they're recorded in a microtask, after the code that returned them
		const errors: Observation = {}
		queueMicrotask(() => {
			recording = true
			errors["~errors"] = object.issues.map(e => ({
				code: e.code,
				path: serialize(e.path, seen, depth + 1),
				expected: read(() => e.expected),
				// printing object data is exponential in its shared references
				actual:
					typeof e.data === "object" && e.data !== null ?
						undefined
					:	read(() => e.actual),
				problem: read(() => e.problem),
				message: read(() => e.message)
			}))
			recording = false
		})
		return errors
	}
	if (object instanceof Error)
		return { "~error": object.name, message: object.message }
	if (object instanceof Date) {
		return {
			"~date": Number.isNaN(object.getTime()) ? "Invalid" : object.toISOString()
		}
	}
	if (object instanceof RegExp) return { "~regex": String(object) }
	if (hasArkKind(object, "scope")) return { "~scope": true }
	if (hasArkKind(object, "generic"))
		return { "~generic": (object as GenericRootType).names }
	if (object instanceof Map || object instanceof Set) {
		return {
			[`~${object.constructor.name}`]: [...object].map(entry =>
				serialize(entry, seen, depth + 1)
			)
		}
	}
	if (Array.isArray(object))
		return Array.from(object, item => serialize(item, seen, depth + 1))
	const result: Record<string, unknown> = {}
	const prototype: object | null = Object.getPrototypeOf(object)
	if (prototype !== Object.prototype) {
		result["~class"] =
			prototype === null ? null : (
				Object.getOwnPropertyDescriptor(prototype, "constructor")?.value?.name
			)
	}
	for (const k of Reflect.ownKeys(object).slice(0, maxKeys)) {
		const descriptor = Object.getOwnPropertyDescriptor(object, k)!
		result[typeof k === "symbol" ? `[${String(k)}]` : k] =
			"value" in descriptor ?
				serialize(descriptor.value, seen, depth + 1)
			:	{ "~accessor": true }
	}
	return result
}

const unitsByFile: Record<string, string[]> = {}
const unitsById: Record<string, () => unknown> = {}
const loadLogsByFile: Record<string, Observation[]> = {}
const describing: string[] = []
let loadingFile = ""

const globals = globalThis as Record<string, unknown>

globals.describe = (name: string, body: () => void) => {
	describing.push(name)
	try {
		body()
	} finally {
		describing.pop()
	}
}

globals.it = (name: string, test: () => unknown) => {
	let id = [loadingFile, ...describing, name].join(" › ")
	while (id in unitsById) id += " (again)"
	unitsById[id] = test
	unitsByFile[loadingFile].push(id)
	// units run without a timeout, so one a test sets is ignored
	return { timeout: () => {} }
}

const run = async (body: () => unknown): Promise<Observation[]> => {
	log = []
	randomState = 0
	callCounts = {}
	takeCalls()
	let outcome: unknown = "pass"
	try {
		await body()
	} catch (e) {
		outcome = record(e)
	}
	log.push({ outcome, calls: takeCalls(callCounts) })
	return log
}

const load = async (file: string) => {
	if (unitsByFile[file]) return
	unitsByFile[file] = []
	loadingFile = file
	loadLogsByFile[file] = await run(() => import(pathToFileURL(file).href))
}

const plan: Plan = await new Promise(resolve =>
	process.once("message", resolve)
)
const logs: Observation[][] = []

if ("list" in plan) for (const file of plan.list) await load(file)
else {
	for (const [unit, file] of plan.steps) {
		await load(file)
		logs.push(await run(unitsById[unit]))
	}
}

process.send!({ unitsByFile, logs, loadLogsByFile } satisfies RunResult, () =>
	process.exit(0)
)
