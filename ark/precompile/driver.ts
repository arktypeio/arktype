import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import type { SourceMap } from "magic-string"
import { parentPort, workerData, type MessagePort } from "node:worker_threads"
import {
	appendSourceMap,
	createNodeHost,
	type NodeHostOptions
} from "./host.ts"
import {
	configuredThreadMessage,
	Precompiler,
	renderDiagnostic,
	type Diagnostic,
	type PrecompileOptions,
	type Site
} from "./precompile.ts"
import { isPrecompilerWorker } from "./worker.ts"

export interface PrecompilePluginOptions
	extends PrecompileOptions,
		NodeHostOptions {}

export const createPrecompiler = (
	opts?: PrecompilePluginOptions
): Precompiler => {
	const cwd = opts?.cwd ?? process.cwd()
	return new Precompiler(createNodeHost(opts), {
		...opts,
		cwd,
		config: opts?.config && resolve(cwd, opts.config)
	})
}

// a host that shows one error for a module throws a module's errors together
export const renderDiagnostics = (
	diagnostics: Diagnostic[]
): { errors: string[]; warnings: string[] } => {
	const errors: string[] = []
	const warnings: string[] = []
	for (const diagnostic of diagnostics) {
		;(diagnostic.severity === "error" ? errors : warnings).push(
			renderDiagnostic(diagnostic)
		)
	}
	return { errors, warnings }
}

export interface PrecompilerWorkerData {
	precompilerOptions: PrecompilePluginOptions
	// a port to answer on and a flag notified after each answer, for a host that waits synchronously
	port?: MessagePort | undefined
	answered?: Int32Array | undefined
}

export type PrecompileRequest =
	| [kind: "transform", source: string, id: string]
	| [kind: "check", source: string, id: string]
	| [kind: "lint", source: string, id: string]
	| [kind: "readDependency", importer: string]
	| [kind: "reset"]
	| [kind: "refresh"]
	| [kind: "close"]

export interface InlineModule {
	// undefined when the module is unchanged
	code: string | undefined
	errors: string[]
	warnings: string[]
}

export interface TransformedModule extends InlineModule {
	map: SourceMap | undefined
	dependencies: string[]
	modules: Record<string, string>
}

export type PrecompileAnswer = { result: unknown } | { error: unknown }

export interface CheckedModule {
	sites: Pick<Site, "start" | "end" | "line" | "column" | "status">[]
	diagnostics: Diagnostic[]
}

export const answerRequests = (
	port: MessagePort,
	data: PrecompilerWorkerData
): void => {
	let tracked: TrackedPrecompiler | undefined
	let needsOtherThread = false
	const answer = (request: PrecompileRequest): unknown => {
		if (request[0] === "close") return
		if (request[0] === "refresh" && tracked && !isStale(tracked)) return false
		if (request[0] === "reset" || request[0] === "refresh") {
			tracked = createTrackedPrecompiler(data.precompilerOptions)
			return needsOtherThread || tracked.precompiler.needsNewThread
		}
		tracked ??= createTrackedPrecompiler(data.precompilerOptions)
		const { precompiler } = tracked
		if (request[0] === "readDependency")
			return precompiler.readDependency(request[1])
		if (request[0] === "transform")
			return transformedModuleOf(precompiler, request[1], request[2])
		if (request[0] === "check")
			return checkedModuleOf(precompiler, request[1], request[2])
		precompiler.forgetCopies()
		const { isKept } = tracked
		tracked.isKept = true
		try {
			const checked = checkedModuleOf(
				precompiler,
				request[1],
				request[2],
				tracked
			)
			if (!isKept || resolvesAgain(tracked, request[2])) return checked
		} catch (e) {
			if ((e as Error).message !== configuredThreadMessage) throw e
			// a module given unlike the configuration this thread applied, as unsaved in an editor, reads another
			needsOtherThread = true
		}
		// the rule refreshes and asks again, since a new precompiler's configuration may need a new thread
		tracked = undefined
	}
	port.on("message", (request: PrecompileRequest) => {
		try {
			port.postMessage({ result: answer(request) } satisfies PrecompileAnswer)
		} catch (e) {
			port.postMessage({ error: e } satisfies PrecompileAnswer)
		}
		if (data.answered) {
			Atomics.store(data.answered, 0, 1)
			Atomics.notify(data.answered, 0)
		}
		if (request[0] === "close") port.close()
	})
}

const checkedModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked?: TrackedPrecompiler
): CheckedModule => {
	if (!precompiler.isTransformed(id) || !precompiles(precompiler, source, id))
		return { sites: [], diagnostics: [] }
	if (tracked) recordGiven(tracked, source, id)
	const { sites, diagnostics } = precompiler.precompile(source, id)
	return {
		sites: sites.map(({ start, end, line, column, status }) => ({
			start,
			end,
			line,
			column,
			status
		})),
		diagnostics
	}
}

export interface KeyedModule extends InlineModule {
	// the module's local import closure, the files its precompilation may read
	files: string[]
}

const mtimeOf = (file: string) =>
	statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? -1

interface TrackedPrecompiler {
	precompiler: Precompiler
	// each file the precompiler read, with its mtime when it was first read
	readTimes: Record<string, number>
	resolutions: Map<string, Map<string, string | undefined>>
	opts: PrecompilePluginOptions
	isKept: boolean
	importsByFile: Record<string, [mtimeMs: number, imports: string[]]>
}

const createTrackedPrecompiler = (
	opts: PrecompilePluginOptions
): TrackedPrecompiler => {
	const readTimes: Record<string, number> = {}
	const resolutions = new Map<string, Map<string, string | undefined>>()
	const precompiler = createPrecompiler(opts)
	const { host } = precompiler.graph
	precompiler.graph.host = {
		...host,
		resolve: (specifier, importer) => {
			let targets = resolutions.get(importer)
			if (!targets) resolutions.set(importer, (targets = new Map()))
			if (!targets.has(specifier))
				targets.set(specifier, host.resolve(specifier, importer))
			return targets.get(specifier)
		},
		readFile: file => {
			// before reading, so a file written meanwhile changes, as does one it couldn't read once it's created
			readTimes[file] ??= mtimeOf(file)
			return host.readFile(file)
		}
	}
	return {
		precompiler,
		readTimes,
		resolutions,
		opts,
		isKept: false,
		importsByFile: {}
	}
}

// a resolver caches what it read, so a kept precompiler's imports are resolved again by a new one before its answer is used
const resolvesAgain = (
	{ precompiler, resolutions, opts }: TrackedPrecompiler,
	id: string
): boolean => {
	const host = createNodeHost(opts)
	const reached = new Set([id])
	if (precompiler.config) reached.add(precompiler.config)
	for (const importer of reached) {
		for (const [specifier, target] of resolutions.get(importer) ?? []) {
			if (host.resolve(specifier, importer) !== target) return false
			if (target !== undefined) reached.add(target)
		}
	}
	return true
}

// a given module stands for its file in later imports, so one unlike its file, as unsaved in an editor, replaces the precompiler
const recordGiven = (
	{ precompiler, readTimes }: TrackedPrecompiler,
	source: string,
	id: string
) => {
	// no mtime equals NaN, so the precompiler is replaced before the next module
	if (precompiler.graph.host.readFile(id) !== source) readTimes[id] = NaN
}

// what the precompiler cached for any module may be read for the next one
const isStale = (
	{ readTimes }: TrackedPrecompiler,
	mtimeNowOf: (file: string) => number = mtimeOf
) => Object.keys(readTimes).some(file => readTimes[file] !== mtimeNowOf(file))

// Turbopack's loader has no worker to hold a precompiler, so it keeps one inline per option set until a file it read changes
export const createKeyedPrecompiler = (
	opts: PrecompilePluginOptions
): ((source: string, id: string) => KeyedModule) => {
	let tracked = createTrackedPrecompiler({ ...opts, inline: true })
	return (source, id) => {
		const mtimes: Record<string, number> = {}
		const currentMtimeOf = (file: string) => (mtimes[file] ??= mtimeOf(file))
		if (isStale(tracked, currentMtimeOf))
			tracked = createTrackedPrecompiler({ ...opts, inline: true })
		if (tracked.isKept) {
			const keyed = keyedModuleOf(tracked, source, id, currentMtimeOf)
			if (resolvesAgain(tracked, id)) return keyed
			tracked = createTrackedPrecompiler({ ...opts, inline: true })
		}
		tracked.isKept = true
		return keyedModuleOf(tracked, source, id, currentMtimeOf)
	}
}

const keyedModuleOf = (
	tracked: TrackedPrecompiler,
	source: string,
	id: string,
	currentMtimeOf: (file: string) => number
): KeyedModule => {
	const { precompiler, importsByFile } = tracked
	const files = precompiler.localClosureOf(id, file => {
		if (file === id) return precompiler.localImportsOf(source, id)
		const cached = importsByFile[file]
		if (currentMtimeOf(file) === -1) return []
		return cached?.[0] === currentMtimeOf(file) ?
				cached[1]
			:	(importsByFile[file] = [
					currentMtimeOf(file),
					precompiler.localImportsOf(readFileSync(file, "utf8"), file)
				])[1]
	})
	const transformed = transformedModuleOf(precompiler, source, id, tracked)
	for (const dependency of transformed?.dependencies ?? [])
		if (!files.includes(dependency)) files.push(dependency)
	return {
		code: transformed?.code,
		errors: transformed?.errors ?? [],
		warnings: transformed?.warnings ?? [],
		files
	}
}

const precompiles = (precompiler: Precompiler, source: string, id: string) =>
	precompiler.checkHelpers || precompiler.importsArk(source, id)

const transformedModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked?: TrackedPrecompiler
): TransformedModule | undefined => {
	if (!precompiler.isTransformed(id)) return
	if (!precompiles(precompiler, source, id)) {
		return {
			code: undefined,
			map: undefined,
			// a module it imports may come to export a Type, which only the bundler plugin watches for here
			dependencies:
				precompiler.inline ? [] : precompiler.localImportsOf(source, id),
			modules: {},
			errors: [],
			warnings: []
		}
	}
	if (tracked) recordGiven(tracked, source, id)
	const result = precompiler.precompile(source, id)
	return {
		code:
			result.map &&
			(precompiler.inline ?
				appendSourceMap(result.code, result.map)
			:	result.code),
		map: precompiler.inline ? undefined : result.map,
		dependencies: result.dependencies,
		modules: result.modules,
		...renderDiagnostics(result.diagnostics)
	}
}

if (isPrecompilerWorker) {
	const data = workerData as PrecompilerWorkerData
	answerRequests(data.port ?? parentPort!, data)
}
